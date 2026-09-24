import { createServerFn } from "@tanstack/react-start";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embed, generateText, LanguageModel, Output, APICallError } from "ai";
import { createSuggestionPrompt, GUARD_INSTRUCTIONS } from "../../utils/prompt";
import { z } from "zod";
import { AISuggestionsSchema } from "@/types";
import { createAzure } from "@ai-sdk/azure";
import { env } from "cloudflare:workers"

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY as string,
});

const azureProvider = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME as string,
  apiKey: process.env.AZURE_FOUNDRY_API_KEY as string,
});


// only queries Jev considers health related are safe
const GUARD_HEALTH_THRESHOLD = 0.5;

const JevResponseSchema = z.object({
  answers: z.object({
    health_related: z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) }),
  }),
});

// Jev is a decisions model: it returns a probability per question instead of generated text
async function checkIfSafe(query: string) {
  const res = await fetch("https://openrouter.ai/api/alpha/decisions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "~typesafe/jev-latest",
      state: { query },
      questions: {
        health_related: { type: "noul", instructions: GUARD_INSTRUCTIONS },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Jev decisions ${res.status}: ${await res.text()}`);
  }
  const { answers } = JevResponseSchema.parse(await res.json());
  return {
    classification: answers.health_related.noul >= GUARD_HEALTH_THRESHOLD ? "safe" : "unsafe",
  } as const;
}

export const generateAISuggestions = createServerFn()
  .validator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    try {
      // first ask the model if the query is 'safe'

      const safety = await checkIfSafe(data.query);
      if (safety.classification === "unsafe") {
        return {
          error: "ERROR_UNSAFE_QUERY",
        };
      }

      const { output } = await generateText({
        model: azureProvider.chat("gpt-6-luna"),
        prompt: createSuggestionPrompt(data.query),
        output: Output.object({
          schema: AISuggestionsSchema,
          name: "AISuggestions",
          description: "AI suggestions",
        }),
        maxRetries: 0
      });

      return { data: output.suggestions, error: null };
    } catch (error) {
      if (error instanceof APICallError && error.statusCode === 429) {
        return {
          error: "ERROR_RATE_LIMIT",
        };
      }
      return {
        error: "ERROR_SYSTEM",
      };
    }
  });

// V2 includes vector search, which performs worse than the original function, both in terms of speed and accuracy. Vector search takes lexically similar suggestions into account, which is not always what we want.
export const generateAISuggestionsWithVectorSearch = createServerFn()
  .validator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    const queryVector = await embed({
      model: openrouter.textEmbeddingModel('openai/text-embedding-3-small'),
      value: data.query
    });

    // get candidates from vector search
    const matches = await env.VECTORIZE.query(queryVector.embedding, {
      topK: 20,
      returnValues: true,
      returnMetadata: "all",
    });

    const suggestionsMetadata = matches.matches.map((match: any) => ({ ...match.metadata, confidence: match.score }));

    // convert to csv
    const headers = ["name", "category", "explanation"];
    const csv = [
      headers.join(","),
      ...suggestionsMetadata.map((item: any) => headers.map((h) => `"${item[h as keyof typeof item]}"`).join(",")),
    ].join("\n");

    try {
      const { output } = await generateText({
        model: openrouter.chat(
          "google/gemini-3.1-flash-lite"
        ) as LanguageModel,
        prompt: createSuggestionPrompt(data.query, csv),
        output: Output.object({
          schema: AISuggestionsSchema,
          name: "AISuggestions",
          description: "AI suggestions",
        }),
        maxRetries: 0
      });
      return { data: output.suggestions.sort((a, b) => b.confidence - a.confidence), error: null };
    } catch (error) {
      if (error instanceof APICallError && error.statusCode === 429) {
        return {
          error: "ERROR_RATE_LIMIT",
        };
      }
      return {
        error: "ERROR_SYSTEM",
      };
    }
  });
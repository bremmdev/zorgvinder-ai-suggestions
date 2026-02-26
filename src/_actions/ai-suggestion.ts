import { createServerFn } from "@tanstack/react-start";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embed, generateText, LanguageModel, Output, APICallError } from "ai";
import { createSuggestionPrompt, createGuardPrompt } from "../../utils/prompt";
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


async function checkIfSafe(query: string) {
  const { output } = await generateText({
    model: openrouter.chat(
      "google/gemini-2.5-flash-lite-preview-09-2025"
    ) as LanguageModel,
    prompt: createGuardPrompt(query),
    output: Output.object({
      schema: z.object({
        classification: z.enum(["safe", "unsafe"]),
      }),
      name: "Guard",
      description: "Check if the query is safe",
    }),
  });
  return output
}

export const generateAISuggestions = createServerFn()
  .inputValidator((d: { query: string }) => d)
  .handler(async ({ data }) => {

    // first ask the model if the query is 'safe'
    const safety = await checkIfSafe(data.query);
    console.log('hier is safety', safety);
    if (safety.classification === "unsafe") {
      return {
        error: "ERROR_UNSAFE_QUERY",
      };
    }

    try {
      const { output } = await generateText({
        model: azureProvider.chat("gpt-5.2-chat"),
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
  .inputValidator((d: { query: string }) => d)
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

    const suggestionsMetadata = matches.matches.map((match: any) => match.metadata);

    // convert to csv
    const headers = ["name", "category"];
    const csv = [
      headers.join(","),
      ...suggestionsMetadata.map((item: any) => headers.map((h) => `"${item[h]}"`).join(",")),
    ].join("\n");

    try {
      const { output } = await generateText({
        model: azureProvider.chat("gpt-5.2-chat"),
        prompt: createSuggestionPrompt(data.query, csv),
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
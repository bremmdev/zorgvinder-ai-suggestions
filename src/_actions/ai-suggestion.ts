import { createServerFn } from "@tanstack/react-start";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, LanguageModel, Output } from "ai";
import { createSuggestionPrompt, createGuardPrompt } from "../../utils/prompt";
import { z } from "zod";
import { AISuggestionsSchema } from "@/types";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY as string,
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
        error: "Query is unsafe",
      };
    }

    try {
      const { output: suggestions } = await generateText({
        model: openrouter.chat(
          "google/gemini-2.5-flash-lite-preview-09-2025"
        ) as LanguageModel,
        prompt: createSuggestionPrompt(data.query),
        output: Output.object({
          schema: AISuggestionsSchema,
          name: "AISuggestions",
          description: "AI suggestions",
        }),
      });

      return { data: suggestions, error: null };
    } catch (error) {
      console.error(error);
      return {
        error: "Failed to get AI suggestions",
      };
    }
  });

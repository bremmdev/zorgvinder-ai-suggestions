import { createServerFn } from "@tanstack/react-start";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, LanguageModel } from "ai";
import { createSuggestionPrompt, createGuardPrompt } from "../../utils/prompt";
import { AISuggestionsSchema } from "@/types";
import { z } from "zod";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY as string,
});

async function checkIfSafe(query: string) {
  const { object } = await generateObject({
    model: openrouter.chat(
      "google/gemini-2.5-flash-lite-preview-09-2025"
    ) as LanguageModel,
    prompt: createGuardPrompt(query),
    schema: z.object({
      classification: z.enum(["safe", "unsafe"]),
    })
  });
  return object;
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
      const { object: suggestions } = await generateObject({
        model: openrouter.chat(
          "google/gemini-2.5-flash-lite-preview-09-2025"
        ) as LanguageModel,
        prompt: createSuggestionPrompt(data.query),
        schema: AISuggestionsSchema,
      });

      return { data: suggestions, error: null };
    } catch (error) {
      console.error(error);
      return {
        error: "Failed to get AI suggestions",
      };
    }
  });

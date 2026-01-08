import { createServerFn } from "@tanstack/react-start";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, LanguageModel } from "ai";
import { createSuggestionPrompt } from "../../utils/prompt";
import { z } from "zod";

export const generateAISuggestions = createServerFn()
  .inputValidator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY as string,
    });

    const schema = z.array(
      z.object({ suggestion: z.string(), explanation: z.string() })
    );

    try {
      const { object: suggestions } = await generateObject({
        model: openrouter.chat(
          "google/gemini-2.5-flash-lite-preview-09-2025"
        ) as LanguageModel,
        prompt: createSuggestionPrompt(data.query),
        schema,
      });

      return { data: suggestions, error: null };
    } catch (error) {
      console.error(error);
      return {
        error: "Failed to get AI suggestions",
      };
    }
  });

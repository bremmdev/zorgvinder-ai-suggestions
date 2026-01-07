import { createServerFn } from "@tanstack/react-start";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, LanguageModel } from "ai";
import { createSuggestionPrompt } from "../../utils/prompt";
import { z } from "zod";

export const generateAISuggestions = createServerFn()
  .inputValidator((d: { query: string; withExplanations?: boolean }) => d)
  .handler(async ({ data }) => {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY as string,
    });

    const schema = data.withExplanations
      ? z.array(z.object({ suggestion: z.string(), explanation: z.string() }))
      : z.array(z.object({ suggestion: z.string() }));

    try {
      const { object: suggestions } = await generateObject({
        model: openrouter.chat(
          "google/gemini-2.5-flash-lite-preview-09-2025"
        ) as LanguageModel,
        prompt: createSuggestionPrompt(data.query, data.withExplanations),
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

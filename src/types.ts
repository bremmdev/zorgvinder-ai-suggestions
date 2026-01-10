import { z } from "zod";

export const AISuggestionsSchema = z.array(
  z.object({
    suggestion: z.string(),
    explanation: z.string(),
    confidence: z.number().min(0).max(1),
  })
);

export type AISuggestion = z.infer<typeof AISuggestionsSchema>[number];

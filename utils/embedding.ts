import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import suggestions from '../data/suggestions-categorized.json';
import { embedMany } from 'ai';
import { writeFileSync } from 'fs';

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY as string,
});

async function createSuggestionEmbeddings() {
    const categorizedSuggestions = suggestions.map(suggestion => `${suggestion.name} - ${suggestion.category}`);

    const { embeddings } = await embedMany({
        model: openrouter.textEmbeddingModel('openai/text-embedding-3-small'),
        values: categorizedSuggestions
    });

    // cf vectorize expects an id and values but we also need to include the metadata for the metadata index
    const result = suggestions
        .map((suggestion, i) =>
            JSON.stringify({
                id: String(i),
                metadata: { name: suggestion.name, category: suggestion.category },
                values: embeddings[i],
            })
        )
        .join("\n");


    writeFileSync("./data/vectors.ndjson", result);
    console.log(`Written ${suggestions.length} vectors to vectors.ndjson`);
}

createSuggestionEmbeddings();
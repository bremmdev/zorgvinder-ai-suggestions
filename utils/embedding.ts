import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import suggestions from '../data/suggestions-categorized.json';
import fs from 'fs';
import { embedMany } from 'ai';

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY as string,
});

async function createSuggestionEmbeddings() {
    const categorizedSuggestions = suggestions.map(suggestion => `${suggestion.name} - ${suggestion.category}`);

    const { embeddings } = await embedMany({
        model: openrouter.textEmbeddingModel('openai/text-embedding-3-small'),
        values: categorizedSuggestions
    });

    const result = suggestions.map((suggestion, i) => ({
        ...suggestion,
        embedding: embeddings[i]
    }));

    fs.writeFileSync("./data/suggestions-embeddings.json", JSON.stringify(result));
}

createSuggestionEmbeddings();
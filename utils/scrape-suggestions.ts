const baseURL = process.env.BASE_URL;

const MAX_RESULTS = 8;
const MAX_DEPTH = 2; // Default depth limit for most prefixes
const DELAY_MS = 100; // Be respectful to the API

// These prefixes get unlimited depth (important medical terms in Dutch)
const DEEP_PREFIXES = [
  "fys", // fysiotherapie
  "ziek", // ziekte, ziekenhuis
  "voet", // voet (foot)
  "hulp", // hulp (help)
  "tand", // tand (tooth/dental)
  "oog", // oog (eye)
  "operatie", // operatie (operation)
  "mond", // mond (mouth)
  "huid", // huid (skin)
];

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

// Check if a prefix matches any deep prefix (should get unlimited depth)
function hasUnlimitedDepth(prefix: string): boolean {
  const prefixLower = prefix.toLowerCase();
  return DEEP_PREFIXES.some(
    (deep) => prefixLower.startsWith(deep) || deep.startsWith(prefixLower)
  );
}

const allSuggestions = new Set<string>();
let requestCount = 0;
let skippedCount = 0;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSuggestions(prefix: string): Promise<string[]> {
  requestCount++;
  const url = `${baseURL}${encodeURIComponent(prefix)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `Failed to fetch for prefix "${prefix}": ${response.status}`
      );
      return [];
    }
    const data = await response.json();
    return data.suggestions ?? [];
  } catch (error) {
    console.error(`Error fetching prefix "${prefix}":`, error);
    return [];
  }
}

function getNextCharsToExplore(
  prefix: string,
  suggestions: string[]
): string[] {
  const prefixLower = prefix.toLowerCase();
  const prefixLen = prefix.length;

  // Extract unique next characters from results
  const seenChars = new Set<string>();
  for (const suggestion of suggestions) {
    const suggestionLower = suggestion.toLowerCase();
    if (
      suggestionLower.startsWith(prefixLower) &&
      suggestionLower.length > prefixLen
    ) {
      const nextChar = suggestionLower[prefixLen];
      if (/[a-z]/.test(nextChar)) {
        seenChars.add(nextChar);
      }
    }
  }

  if (seenChars.size === 0) {
    // No valid next chars found, explore all (shouldn't happen often)
    return ALPHABET.split("");
  }

  // Sort the seen characters
  const sortedSeen = Array.from(seenChars).sort();
  const lastSeen = sortedSeen[sortedSeen.length - 1];

  // If results are alphabetically ordered (which most APIs do), we can assume:
  // - Everything BEFORE the first seen char: would have appeared if existed → skip
  // - Everything AFTER the last seen char: might exist but wasn't shown → MUST explore
  // - Chars we've seen in results: definitely explore

  const charsToExplore: string[] = [];
  const lastSeenIndex = ALPHABET.indexOf(lastSeen);

  // Explore all seen characters
  for (const char of sortedSeen) {
    charsToExplore.push(char);
  }

  // Explore everything AFTER the last seen character (might have unseen results)
  for (let i = lastSeenIndex + 1; i < ALPHABET.length; i++) {
    charsToExplore.push(ALPHABET[i]);
  }

  return charsToExplore;
}

async function explorePrefix(prefix: string, depth: number = 0): Promise<void> {
  const indent = "  ".repeat(depth);
  console.log(`${indent}Exploring: "${prefix}"`);

  await delay(DELAY_MS);
  const suggestions = await fetchSuggestions(prefix);

  // Add all new suggestions to our collection
  for (const suggestion of suggestions) {
    allSuggestions.add(suggestion);
  }

  console.log(
    `${indent}  Found ${suggestions.length} results (total unique: ${allSuggestions.size})`
  );

  // If we hit the max, there might be more - expand the prefix
  if (suggestions.length >= MAX_RESULTS) {
    // Check depth limit (skip for special deep prefixes)
    const unlimited = hasUnlimitedDepth(prefix);
    if (!unlimited && depth >= MAX_DEPTH) {
      console.log(
        `${indent}  Hit max but at depth limit (${MAX_DEPTH}), stopping expansion`
      );
      return;
    }

    const charsToExplore = getNextCharsToExplore(prefix, suggestions);
    const skipped = 26 - charsToExplore.length;
    skippedCount += skipped;

    const depthNote = unlimited ? " [DEEP]" : "";
    console.log(
      `${indent}  Hit max, exploring ${charsToExplore.length} chars: [${charsToExplore.join("")}]${depthNote} (skipped ${skipped})`
    );

    for (const char of charsToExplore) {
      await explorePrefix(prefix + char, depth + 1);
    }
  }
}

async function scrapeAllSuggestions(): Promise<string[]> {
  console.log("Starting comprehensive suggestion scrape...");
  console.log(`Default max depth: ${MAX_DEPTH}`);
  console.log(`Unlimited depth for: ${DEEP_PREFIXES.join(", ")}`);
  console.log("");

  const startTime = Date.now();

  // Start with each character in the alphabet
  for (const char of ALPHABET) {
    await explorePrefix(char);
  }

  // Also try empty string to catch any default suggestions
  await explorePrefix("");

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("");
  console.log("=".repeat(50));
  console.log(`Scraping complete!`);
  console.log(`Total unique suggestions: ${allSuggestions.size}`);
  console.log(`Total API requests: ${requestCount}`);
  console.log(`Skipped prefix explorations: ${skippedCount}`);
  console.log(`Duration: ${duration}s`);
  console.log("=".repeat(50));

  return Array.from(allSuggestions).sort();
}

scrapeAllSuggestions()
  .then(async (suggestions) => {
    // Save results to a JSON file
    const fs = await import("fs");
    const outputPath = "./data/suggestions.json";
    fs.writeFileSync(outputPath, JSON.stringify(suggestions, null, 2));
    console.log(`Results saved to ${outputPath}`);
  })
  .catch(console.error);

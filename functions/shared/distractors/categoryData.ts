/**
 * Category Data and Lookups
 *
 * Provides semantic category information for words to enable
 * category-aware distractor generation.
 */

import CATEGORIZED_WORDS from './categorized_words.json';

/**
 * Category names and their word lists
 */
export const CATEGORIES: Record<string, string[]> = CATEGORIZED_WORDS;

/**
 * Reverse lookup map: word -> category
 * Built at module load time for fast category lookups.
 */
export const WORD_TO_CATEGORY = new Map<string, string>();

// Build reverse lookup
for (const [category, words] of Object.entries(CATEGORIES)) {
  for (const word of words) {
    WORD_TO_CATEGORY.set(word, category);
  }
}

/**
 * Get the category for a given word.
 * Returns undefined if the word is not categorized.
 */
export function getWordCategory(word: string): string | undefined {
  return WORD_TO_CATEGORY.get(word);
}

/**
 * Get all words in the same category as the target word.
 * Returns empty array if word is not categorized.
 */
export function getCategoryWords(word: string): string[] {
  const category = WORD_TO_CATEGORY.get(word);
  if (!category) {
    return [];
  }
  return CATEGORIES[category] || [];
}

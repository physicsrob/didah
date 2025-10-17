/**
 * Utilities for handling punctuation in words for distractor generation
 */

export interface PunctuationPattern {
  leading: string;
  base: string;
  trailing: string;
}

/**
 * Extract punctuation from a word
 *
 * Examples:
 * - "dog," → { leading: "", base: "dog", trailing: "," }
 * - "(hello)" → { leading: "(", base: "hello", trailing: ")" }
 * - "word" → { leading: "", base: "word", trailing: "" }
 * - "..." → { leading: "", base: "", trailing: "..." }
 */
export function extractPunctuation(word: string): PunctuationPattern {
  // Match leading non-alphanumeric characters
  const leadingMatch = word.match(/^[^a-zA-Z0-9]+/);
  const leading = leadingMatch ? leadingMatch[0] : '';

  // Match trailing non-alphanumeric characters
  const trailingMatch = word.match(/[^a-zA-Z0-9]+$/);
  const trailing = trailingMatch ? trailingMatch[0] : '';

  // Extract base word (everything between leading and trailing)
  const base = word.slice(leading.length, word.length - trailing.length);

  return { leading, base, trailing };
}

/**
 * Apply punctuation pattern to a word
 *
 * Examples:
 * - applyPunctuation("cat", "", ",") → "cat,"
 * - applyPunctuation("hi", "(", ")") → "(hi)"
 */
export function applyPunctuation(
  word: string,
  leading: string,
  trailing: string
): string {
  return leading + word + trailing;
}

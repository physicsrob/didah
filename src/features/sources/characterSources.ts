/**
 * CharacterSource implementations for different text types
 */

import type { CharacterSource } from '../session/runtime/sessionProgram';

/**
 * Maximum attempts to find a valid character before throwing an error.
 * Prevents stack overflow from long sequences of invalid characters (URLs, emojis, etc.)
 */
const MAX_SKIP_ATTEMPTS = 10000;

/**
 * Source for continuous text (e.g., word lists)
 * Splits on spaces and cycles through words
 */
export class ContinuousTextSource implements CharacterSource {
  private words: string[];
  private currentWordIndex: number = 0;
  private currentCharIndex: number = 0;
  private currentWord: string;
  private allowedChars: Set<string>;

  constructor(text: string, effectiveAlphabet: string[]) {
    // Split text into words and filter out empty strings
    this.words = text.split(/\s+/).filter(word => word.length > 0);
    this.currentWord = this.words[0] || '';
    // Store allowed characters as a Set for O(1) lookup
    this.allowedChars = new Set(effectiveAlphabet.map(char => char.toUpperCase()));
  }

  next(): string {
    let attempts = 0;

    while (attempts < MAX_SKIP_ATTEMPTS) {
      attempts++;

      // If we've reached the end of current word
      if (this.currentCharIndex >= this.currentWord.length) {
        // Move to next word
        this.currentWordIndex = (this.currentWordIndex + 1) % this.words.length;
        this.currentWord = this.words[this.currentWordIndex] || '';
        this.currentCharIndex = 0;

        // Return space between words
        return ' ';
      }

      // Get next character from current word
      const char = this.currentWord[this.currentCharIndex].toUpperCase();
      this.currentCharIndex++;

      // Check if character is in allowed alphabet
      if (this.allowedChars.has(char)) {
        return char;
      }

      // Character not in Morse alphabet, continue to next iteration
    }

    throw new Error(`ContinuousTextSource: Failed to find valid character after ${MAX_SKIP_ATTEMPTS} attempts. Check that source text contains alphanumeric characters.`);
  }

  peek(count: number = 1): string | null {
    let tempWordIndex = this.currentWordIndex;
    let tempCharIndex = this.currentCharIndex;
    let tempWord = this.currentWord;
    let attempts = 0;
    let result = '';

    // Collect 'count' characters
    for (let i = 0; i < count; i++) {
      let found = false;

      while (attempts < MAX_SKIP_ATTEMPTS && !found) {
        attempts++;

        // If we've reached the end of current word
        if (tempCharIndex >= tempWord.length) {
          // Move to next word
          tempWordIndex = (tempWordIndex + 1) % this.words.length;
          tempWord = this.words[tempWordIndex] || '';
          tempCharIndex = 0;

          // Return space between words
          result += ' ';
          found = true;
          break;
        }

        // Get next character from current word
        const char = tempWord[tempCharIndex].toUpperCase();
        tempCharIndex++;

        // Check if character is in allowed alphabet
        if (this.allowedChars.has(char)) {
          result += char;
          found = true;
          break;
        }

        // Character not in Morse alphabet, continue to next iteration
      }

      // If we couldn't find a character, return what we have so far (or null if nothing)
      if (!found) {
        return result.length > 0 ? result : null;
      }
    }

    return result.length > 0 ? result : null;
  }

  reset(): void {
    this.currentWordIndex = 0;
    this.currentCharIndex = 0;
    this.currentWord = this.words[0] || '';
  }
}

/**
 * Source for head copy mode
 * Emits whole words instead of individual characters
 */
export class WordSource implements CharacterSource {
  private words: string[];
  private currentIndex: number = 0;

  constructor(text: string) {
    // Split text into words and filter out empty strings
    this.words = text.split(/\s+/).filter(word => word.length > 0);

    if (this.words.length === 0) {
      throw new Error('WordSource: No valid words found in source text');
    }
  }

  next(): string {
    // Return whole word
    const word = this.words[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.words.length;
    return word.toLowerCase();
  }

  peek(_count: number = 1): string | null {
    // For WordSource, peek returns the next word (ignoring count since we emit whole words)
    // Note: count parameter is accepted for interface compatibility but not used
    const nextIndex = (this.currentIndex + 1) % this.words.length;
    return this.words[nextIndex]?.toLowerCase() || null;
  }

  reset(): void {
    this.currentIndex = 0;
  }
}


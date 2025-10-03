/**
 * CharacterSource implementations for different text types
 */

import type { CharacterSource } from '../session/runtime/sessionProgram';
import type { FullPost } from './types';
import { shuffleArray } from '../../core/utils/array';

/**
 * Word entry with distractors (from word-sources API)
 */
export interface WordEntry {
  word: string;
  distractors: string[];
}

/**
 * Maximum attempts to find a valid character before throwing an error.
 * Prevents stack overflow from long sequences of invalid characters (URLs, emojis, etc.)
 */
const MAX_SKIP_ATTEMPTS = 10000;

function stripUrls(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/www\.[^\s]+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Source that cycles through an array of text items (e.g., headlines)
 * Preserves spaces within items, adds " = " separator between items
 */
export class ArraySource implements CharacterSource {
  private items: string[];
  private currentItemIndex: number = 0;
  private currentCharIndex: number = 0;
  private currentText: string;
  private allowedChars: Set<string>;

  constructor(items: string[], allowedChars: string) {
    // Add " = " separator to each item (so it's part of the text)
    this.items = items.map(item => item + ' = ');
    this.currentText = this.items[0] || '';

    // Build set of allowed characters - ensure space and = are always included
    this.allowedChars = new Set((allowedChars + ' =').toUpperCase());
  }

  next(): string {
    let attempts = 0;

    while (attempts < MAX_SKIP_ATTEMPTS) {
      attempts++;

      // If we've reached the end of current item
      if (this.currentCharIndex >= this.currentText.length) {
        // Move to next item
        this.currentItemIndex = (this.currentItemIndex + 1) % this.items.length;
        this.currentText = this.items[this.currentItemIndex] || '';
        this.currentCharIndex = 0;
        continue; // Try again with next item
      }

      // Get next character from current item
      const char = this.currentText[this.currentCharIndex];
      this.currentCharIndex++;

      // Handle whitespace
      if (char === ' ' || /\s/.test(char)) {
        return ' ';
      }

      // Check if character is allowed
      const upperChar = char.toUpperCase();
      if (this.allowedChars.has(upperChar)) {
        return upperChar;
      }

      // Character not allowed, continue to next iteration
    }

    throw new Error(`ArraySource: Failed to find valid character after ${MAX_SKIP_ATTEMPTS} attempts. Check that source text contains valid characters from the allowed alphabet.`);
  }

  reset(): void {
    this.currentItemIndex = 0;
    this.currentCharIndex = 0;
    this.currentText = this.items[0] || '';
  }
}

/**
 * Source for continuous text (e.g., word lists)
 * Splits on spaces and cycles through words
 */
export class ContinuousTextSource implements CharacterSource {
  private words: string[];
  private currentWordIndex: number = 0;
  private currentCharIndex: number = 0;
  private currentWord: string;

  constructor(text: string) {
    // Split text into words and filter out empty strings
    this.words = text.split(/\s+/).filter(word => word.length > 0);
    this.currentWord = this.words[0] || '';
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

      // Check if alphanumeric
      if (/[A-Z0-9]/.test(char)) {
        return char;
      }

      // Character not alphanumeric, continue to next iteration
    }

    throw new Error(`ContinuousTextSource: Failed to find valid character after ${MAX_SKIP_ATTEMPTS} attempts. Check that source text contains alphanumeric characters.`);
  }

  reset(): void {
    this.currentWordIndex = 0;
    this.currentCharIndex = 0;
    this.currentWord = this.words[0] || '';
  }
}

/**
 * Local random character source (fallback)
 * Groups characters by 5 with spaces, same as backend
 */
export class LocalRandomSource implements CharacterSource {
  private readonly chars: string[];
  private charCount: number = 0;

  constructor(alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    this.chars = alphabet.split('');
  }

  next(): string {
    if (this.charCount > 0 && this.charCount % 5 === 0) {
      this.charCount++;
      return ' ';
    }
    this.charCount++;
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }

  reset(): void {
    this.charCount = 0;
  }
}

/**
 * Source for Reddit/RSS posts with title and body
 * Can format as headlines only or full content based on mode
 */
export class FullPostSource implements CharacterSource {
  private items: string[];
  private currentItemIndex: number = 0;
  private currentCharIndex: number = 0;
  private currentText: string;
  private allowedChars: Set<string>;

  constructor(posts: FullPost[], allowedChars: string, fullMode: boolean = false) {
    // Format posts based on mode
    if (fullMode) {
      // Full mode: TITLE = BODY AR (with AR as separator between posts)
      this.items = posts.map(post => {
        const body = stripUrls(post.body.trim());
        if (body) {
          return `${post.title} = ${body} AR`;
        } else {
          // No body, just use title with separator
          return `${post.title} AR`;
        }
      });
    } else {
      // Headlines mode: TITLE = TITLE =
      this.items = posts.map(post => post.title + ' = ');
    }

    this.currentText = this.items[0] || '';

    // Build set of allowed characters - ensure space, =, A, and R are always included
    this.allowedChars = new Set((allowedChars + ' =AR').toUpperCase());
  }

  next(): string {
    let attempts = 0;

    while (attempts < MAX_SKIP_ATTEMPTS) {
      attempts++;

      // If we've reached the end of current item
      if (this.currentCharIndex >= this.currentText.length) {
        // Move to next item
        this.currentItemIndex = (this.currentItemIndex + 1) % this.items.length;
        this.currentText = this.items[this.currentItemIndex] || '';
        this.currentCharIndex = 0;
        continue; // Try again with next item
      }

      // Get next character from current item
      const char = this.currentText[this.currentCharIndex];
      this.currentCharIndex++;

      // Handle whitespace
      if (char === ' ' || /\s/.test(char)) {
        return ' ';
      }

      // Check if character is allowed
      const upperChar = char.toUpperCase();
      if (this.allowedChars.has(upperChar)) {
        return upperChar;
      }

      // Character not allowed, continue to next iteration
    }

    throw new Error(`FullPostSource: Failed to find valid character after ${MAX_SKIP_ATTEMPTS} attempts. Check that source text contains valid characters from the allowed alphabet.`);
  }

  reset(): void {
    this.currentItemIndex = 0;
    this.currentCharIndex = 0;
    this.currentText = this.items[0] || '';
  }
}

/**
 * Source for Word Practice mode
 * Returns JSON-encoded word entries with pre-calculated distractors
 */
export class WordSource implements CharacterSource {
  private wordEntries: WordEntry[];
  private currentIndex: number = 0;

  constructor(wordEntries: WordEntry[]) {
    if (!wordEntries || wordEntries.length === 0) {
      throw new Error('WordSource requires at least one word entry');
    }
    // Shuffle word entries to avoid always seeing high-frequency words first
    this.wordEntries = shuffleArray(wordEntries);
  }

  next(): string {
    // Get current word entry
    const entry = this.wordEntries[this.currentIndex];

    // Move to next (cycle through)
    this.currentIndex = (this.currentIndex + 1) % this.wordEntries.length;

    // Return JSON-encoded entry
    return JSON.stringify(entry);
  }

  reset(): void {
    this.currentIndex = 0;
  }
}
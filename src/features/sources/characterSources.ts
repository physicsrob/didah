/**
 * CharacterSource implementations for different text types
 */

import type { CharacterSource } from '../session/runtime/sessionProgram';
import type { FullPost } from './types';

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

  peek(count: number = 1): string | null {
    let tempItemIndex = this.currentItemIndex;
    let tempCharIndex = this.currentCharIndex;
    let tempText = this.currentText;
    let attempts = 0;
    let result = '';

    // Collect 'count' characters
    for (let i = 0; i < count; i++) {
      let found = false;

      while (attempts < MAX_SKIP_ATTEMPTS && !found) {
        attempts++;

        // If we've reached the end of current item
        if (tempCharIndex >= tempText.length) {
          // Move to next item
          tempItemIndex = (tempItemIndex + 1) % this.items.length;
          tempText = this.items[tempItemIndex] || '';
          tempCharIndex = 0;
          continue; // Try again with next item
        }

        // Get next character from current item
        const char = tempText[tempCharIndex];
        tempCharIndex++;

        // Handle whitespace
        if (char === ' ' || /\s/.test(char)) {
          result += ' ';
          found = true;
          break;
        }

        // Check if character is allowed
        const upperChar = char.toUpperCase();
        if (this.allowedChars.has(upperChar)) {
          result += upperChar;
          found = true;
          break;
        }

        // Character not allowed, continue to next iteration
      }

      // If we couldn't find a character, return what we have so far (or null if nothing)
      if (!found) {
        return result.length > 0 ? result : null;
      }
    }

    return result.length > 0 ? result : null;
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

        // Check if alphanumeric
        if (/[A-Z0-9]/.test(char)) {
          result += char;
          found = true;
          break;
        }

        // Character not alphanumeric, continue to next iteration
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
 * Source for word practice mode
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

  peek(count: number = 1): string | null {
    let tempItemIndex = this.currentItemIndex;
    let tempCharIndex = this.currentCharIndex;
    let tempText = this.currentText;
    let attempts = 0;
    let result = '';

    // Collect 'count' characters
    for (let i = 0; i < count; i++) {
      let found = false;

      while (attempts < MAX_SKIP_ATTEMPTS && !found) {
        attempts++;

        // If we've reached the end of current item
        if (tempCharIndex >= tempText.length) {
          // Move to next item
          tempItemIndex = (tempItemIndex + 1) % this.items.length;
          tempText = this.items[tempItemIndex] || '';
          tempCharIndex = 0;
          continue; // Try again with next item
        }

        // Get next character from current item
        const char = tempText[tempCharIndex];
        tempCharIndex++;

        // Handle whitespace
        if (char === ' ' || /\s/.test(char)) {
          result += ' ';
          found = true;
          break;
        }

        // Check if character is allowed
        const upperChar = char.toUpperCase();
        if (this.allowedChars.has(upperChar)) {
          result += upperChar;
          found = true;
          break;
        }

        // Character not allowed, continue to next iteration
      }

      // If we couldn't find a character, return what we have so far (or null if nothing)
      if (!found) {
        return result.length > 0 ? result : null;
      }
    }

    return result.length > 0 ? result : null;
  }

  reset(): void {
    this.currentItemIndex = 0;
    this.currentCharIndex = 0;
    this.currentText = this.items[0] || '';
  }
}
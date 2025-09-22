/**
 * CharacterSource implementations for different text types
 */

import type { CharacterSource } from '../session/runtime/sessionProgram';

/**
 * Source that cycles through an array of text items (e.g., headlines)
 * Preserves spaces within items, adds "=" separator between items
 */
export class ArraySource implements CharacterSource {
  private items: string[];
  private currentItemIndex: number = 0;
  private currentCharIndex: number = 0;
  private currentText: string;

  constructor(items: string[]) {
    this.items = items;
    this.currentText = this.items[0] || '';
  }

  next(): string {
    // If we've reached the end of current item
    if (this.currentCharIndex >= this.currentText.length) {
      // Move to next item
      this.currentItemIndex = (this.currentItemIndex + 1) % this.items.length;
      this.currentText = this.items[this.currentItemIndex] || '';
      this.currentCharIndex = 0;

      // Return separator between items
      return '=';
    }

    // Get next character from current item
    const char = this.currentText[this.currentCharIndex];
    this.currentCharIndex++;

    // Handle spaces
    if (char === ' ' || /\s/.test(char)) {
      return ' ';
    }

    // Skip non-alphanumeric/non-space characters
    const upperChar = char.toUpperCase();
    if (!/[A-Z0-9]/.test(upperChar)) {
      return this.next(); // Recursively get next valid character
    }

    return upperChar;
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

    // Skip non-alphanumeric characters (but preserve spaces)
    if (!/[A-Z0-9]/.test(char)) {
      return this.next(); // Recursively get next valid character
    }

    return char;
  }

  reset(): void {
    this.currentWordIndex = 0;
    this.currentCharIndex = 0;
    this.currentWord = this.words[0] || '';
  }
}

/**
 * Local random character source (fallback)
 * Same as existing RandomCharSource
 */
export class LocalRandomSource implements CharacterSource {
  private readonly chars: string[];

  constructor(alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    this.chars = alphabet.split('');
  }

  next(): string {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }

  reset(): void {
    // No state to reset for random source
  }
}
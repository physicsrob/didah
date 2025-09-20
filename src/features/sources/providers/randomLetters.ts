/**
 * Random Letters Text Source
 *
 * Provides random letters from the configured alphabet for practice sessions.
 */

import type { CharacterSource } from '../../session/types.js';
import { getCharactersByCategory } from '../../../core/morse/alphabet.js';

export interface RandomLettersConfig {
  includeNumbers: boolean;
  includeStandardPunctuation: boolean;
  includeAdvancedPunctuation: boolean;
}

export class RandomLettersSource implements CharacterSource {
  private alphabet: string[] = [];

  constructor(private config: RandomLettersConfig) {
    this.updateAlphabet();
  }

  private updateAlphabet(): void {
    const chars = getCharactersByCategory();

    // Always include letters
    this.alphabet = [...chars.letters];

    // Add configured character sets
    if (this.config.includeNumbers) {
      this.alphabet.push(...chars.numbers);
    }

    if (this.config.includeStandardPunctuation) {
      this.alphabet.push(...chars.standardPunctuation);
    }

    if (this.config.includeAdvancedPunctuation) {
      this.alphabet.push(...chars.advancedPunctuation);
    }
  }

  next(): string {
    if (this.alphabet.length === 0) {
      throw new Error('No characters available in alphabet');
    }

    const index = Math.floor(Math.random() * this.alphabet.length);
    return this.alphabet[index];
  }

  updateConfig(config: Partial<RandomLettersConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateAlphabet();
  }
}
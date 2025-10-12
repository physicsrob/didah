/**
 * Factory for creating CharacterSource instances based on content
 */

import type { CharacterSource } from '../session/runtime/sessionProgram';
import type { SourceContent, FullPost } from './types';
import { ArraySource, ContinuousTextSource, FullPostSource, WordSource, type WordEntry } from './characterSources';

/**
 * Check if items are FullPost objects
 */
function isFullPostArray(items: unknown[]): items is FullPost[] {
  return items.length > 0 &&
         typeof items[0] === 'object' &&
         items[0] !== null &&
         'title' in items[0] &&
         'body' in items[0];
}

/**
 * Check if items are WordEntry objects
 */
function isWordEntryArray(items: unknown[]): items is WordEntry[] {
  return items.length > 0 &&
         typeof items[0] === 'object' &&
         items[0] !== null &&
         'word' in items[0] &&
         'distractors' in items[0];
}

/**
 * Create appropriate CharacterSource based on content type
 */
export function createCharacterSource(
  content: SourceContent | null,
  effectiveAlphabet: string[]
): CharacterSource {
  // Fail fast if no content provided
  if (!content) {
    throw new Error('No source content provided to createCharacterSource');
  }

  if (!content.items || content.items.length === 0) {
    throw new Error(`Source ${content.id} returned no items`);
  }

  // Determine source type based on content
  const { id, items } = content;

  // Word Practice sources - return WordSource
  if (isWordEntryArray(items)) {
    return new WordSource(items);
  }

  // Random and word sources come as a single long string
  if (id.includes('words') || id === 'random_letters' || id === 'random_characters') {
    // Single string of words/letters/characters
    if (items.length === 1 && typeof items[0] === 'string') {
      return new ContinuousTextSource(items[0]);
    }
  }

  // Check if this is structured Reddit/RSS data
  if (isFullPostArray(items)) {
    const alphabet = effectiveAlphabet.join('');
    // Determine full mode from the frontend ID
    const isFullMode = id.endsWith('_full');
    return new FullPostSource(items, alphabet, isFullMode);
  }

  // RSS/headline sources come as array of separate items (legacy string format)
  if (id.includes('reddit') || id.includes('news') || id.includes('hackernews')) {
    const alphabet = effectiveAlphabet.join('');
    return new ArraySource(items as string[], alphabet);
  }

  // Default: if multiple items, use array source; if single, use continuous
  if (items.length > 1) {
    const alphabet = effectiveAlphabet.join('');
    return new ArraySource(items as string[], alphabet);
  } else {
    return new ContinuousTextSource(items[0] as string);
  }
}
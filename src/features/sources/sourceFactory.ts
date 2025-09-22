/**
 * Factory for creating CharacterSource instances based on content
 */

import type { CharacterSource } from '../session/runtime/sessionProgram';
import type { SourceContent } from './types';
import { ArraySource, ContinuousTextSource, LocalRandomSource } from './characterSources';

/**
 * Create appropriate CharacterSource based on content type
 */
export function createCharacterSource(
  content: SourceContent | null,
  effectiveAlphabet: string[]
): CharacterSource {
  // Fallback to local random source if no content
  if (!content || !content.items || content.items.length === 0) {
    const alphabet = effectiveAlphabet.join('');
    return new LocalRandomSource(alphabet);
  }

  // Determine source type based on content
  const { id, items } = content;

  // Word sources come as a single long string
  if (id.includes('words') || id === 'random_letters') {
    // Single string of words/letters
    if (items.length === 1) {
      return new ContinuousTextSource(items[0]);
    }
  }

  // RSS/headline sources come as array of separate items
  if (id.includes('reddit') || id.includes('news') || id.includes('hackernews')) {
    const alphabet = effectiveAlphabet.join('');
    return new ArraySource(items, alphabet);
  }

  // Default: if multiple items, use array source; if single, use continuous
  if (items.length > 1) {
    const alphabet = effectiveAlphabet.join('');
    return new ArraySource(items, alphabet);
  } else {
    return new ContinuousTextSource(items[0]);
  }
}
/**
 * Factory for creating CharacterSource instances based on content
 */

import type { CharacterSource } from '../session/runtime/sessionProgram';
import type { SourceContent, FullPost } from './types';
import { ArraySource, ContinuousTextSource, FullPostSource, WordSource } from './characterSources';

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
 * Create appropriate CharacterSource based on content type
 */
export function createCharacterSource(
  content: SourceContent | null,
  effectiveAlphabet: string[],
  emissionGranularity: 'character' | 'word'
): CharacterSource {
  // Fail fast if no content provided
  if (!content) {
    throw new Error('No source content provided to createCharacterSource');
  }

  if (!content.items || content.items.length === 0) {
    throw new Error(`Source ${content.id} returned no items`);
  }

  // If word granularity requested, create WordSource from any content
  if (emissionGranularity === 'word') {
    // Handle different item formats
    let text: string;

    if (Array.isArray(content.items)) {
      // For FullPost arrays, extract titles only
      if (content.items.length > 0 && typeof content.items[0] === 'object' && 'title' in content.items[0]) {
        text = (content.items as FullPost[]).map(p => p.title).join(' ');
      } else {
        // Regular string array - join with spaces
        text = content.items.join(' ');
      }
    } else {
      text = String(content.items);
    }

    return new WordSource(text);
  }

  // Determine source type based on content
  const { id, items } = content;

  // Random and word sources come as a single long string
  if (id.includes('words') || id.includes('top-') || id === 'random_letters' || id === 'random_characters') {
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
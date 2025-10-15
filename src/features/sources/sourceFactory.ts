/**
 * Factory for creating CharacterSource instances based on content
 */

import type { CharacterSource } from '../session/runtime/sessionProgram';
import type { SourceContent } from './types';
import { ContinuousTextSource, WordSource } from './characterSources';

/**
 * Create appropriate CharacterSource based on content type
 */
export function createCharacterSource(
  content: SourceContent | null,
  _effectiveAlphabet: string[],
  emissionGranularity: 'character' | 'word'
): CharacterSource {
  if (!content?.items?.length) {
    throw new Error('No source content provided');
  }

  // Backend always returns items as string[], with items[0] containing the formatted text
  const text = content.items[0];

  if (emissionGranularity === 'word') {
    return new WordSource(text);
  }

  return new ContinuousTextSource(text);
}
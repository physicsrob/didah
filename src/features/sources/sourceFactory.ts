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
  if (!content?.text) {
    throw new Error('No source content provided');
  }

  if (emissionGranularity === 'word') {
    return new WordSource(content.text);
  }

  return new ContinuousTextSource(content.text);
}
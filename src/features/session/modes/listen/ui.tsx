/**
 * Listen Mode - UI Components
 *
 * React components and hooks for Listen mode interface.
 */

import type { SessionSnapshot } from '../../runtime/io';
import { CharacterDisplay, type DisplayCharacter } from '../../../../components/CharacterDisplay';

/**
 * Display component for Listen mode
 * Shows emitted characters with neutral status (no correct/incorrect feedback)
 */
export function ListenDisplay({ snapshot }: { snapshot: SessionSnapshot }) {
  const characters: DisplayCharacter[] = snapshot.emissions.map((e, i) => ({
    text: e.char,
    status: 'neutral' as const,
    key: i
  }));

  return <CharacterDisplay characters={characters} />;
}

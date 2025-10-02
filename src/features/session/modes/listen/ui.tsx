/**
 * Listen Mode - UI Components
 *
 * React components and hooks for Listen mode interface.
 */

/* eslint-disable react-refresh/only-export-components */

import type { SessionSnapshot } from '../../runtime/io';
import type { InputBus } from '../../runtime/inputBus';
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

/**
 * Keyboard input hook for Listen mode
 * No-op: Listen mode doesn't use keyboard input
 */
export function useListenInput(
  _input: InputBus,
  _sessionPhase: 'waiting' | 'countdown' | 'active',
  _isPaused: boolean,
  _snapshot: SessionSnapshot,
  _updateSnapshot: (updates: Partial<SessionSnapshot>) => void,
  _onPause?: () => void
) {
  // No-op: Listen mode doesn't capture keyboard input
}

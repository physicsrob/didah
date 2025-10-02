/**
 * Listen Mode - UI Components
 *
 * React components and hooks for Listen mode interface.
 */

/* eslint-disable react-refresh/only-export-components */

import type { SessionSnapshot } from '../../runtime/io';
import { CharacterDisplay } from '../../../../components/CharacterDisplay';
import { historyToDisplay } from '../../../../components/CharacterDisplay.transformations';

/**
 * Display component for Listen mode
 * Shows character history with 'listen' result (no correct/incorrect)
 */
export function ListenDisplay({ snapshot }: { snapshot: SessionSnapshot }) {
  return (
    <CharacterDisplay
      characters={historyToDisplay(snapshot.previous)}
    />
  );
}

/**
 * Keyboard input hook for Listen mode
 * No-op: Listen mode doesn't use keyboard input
 */
export function useListenInput() {
  // No-op: Listen mode doesn't capture keyboard input
}

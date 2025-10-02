/**
 * Live Copy Mode - UI Components
 *
 * React components and hooks for Live Copy mode interface.
 */

/* eslint-disable react-refresh/only-export-components */

import { useRef, useEffect } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import type { InputBus } from '../../runtime/inputBus';
import { CharacterDisplay, type DisplayCharacter } from '../../../../components/CharacterDisplay';

/**
 * Display component for Live Copy mode
 * Shows what the user has typed (no corrections until session end)
 */
export function LiveCopyDisplay({
  snapshot
}: {
  snapshot: SessionSnapshot;
}) {
  const typedString = snapshot.liveCopyTyped || '';
  const characters: DisplayCharacter[] = typedString.split('').map((char, i) => ({
    text: char,
    status: 'neutral' as const,
    key: i
  }));

  return <CharacterDisplay characters={characters} />;
}

/**
 * Keyboard input hook for Live Copy mode
 * Manages typed string with backspace support
 * Updates snapshot directly via updateSnapshot
 */
export function useLiveCopyInput(
  _input: InputBus,
  sessionPhase: 'waiting' | 'countdown' | 'active',
  isPaused: boolean,
  snapshot: SessionSnapshot,
  updateSnapshot: (updates: Partial<SessionSnapshot>) => void,
  onPause?: () => void
): void {
  // Keep ref to avoid stale closures
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle pause
      if (e.key === 'Escape' && onPause && sessionPhase === 'active') {
        onPause();
        return;
      }

      // Only capture input during active session
      if (sessionPhase !== 'active' || isPaused) return;

      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        const current = snapshotRef.current.liveCopyTyped || '';
        updateSnapshot({ liveCopyTyped: current.slice(0, -1) });
        return;
      }

      // Handle character input
      if (e.key.length === 1) {
        e.preventDefault();
        const current = snapshotRef.current.liveCopyTyped || '';
        updateSnapshot({ liveCopyTyped: current + e.key.toUpperCase() });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionPhase, isPaused, updateSnapshot, onPause]);
}

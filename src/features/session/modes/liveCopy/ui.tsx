/**
 * Live Copy Mode - UI Components
 *
 * React components and hooks for Live Copy mode interface.
 */

/* eslint-disable react-refresh/only-export-components */

import { useRef, useEffect } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import type { UIContext } from '../shared/types';
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
  const typedString = snapshot.liveCopyState?.typedString || '';
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
export function useLiveCopyInput(context: UIContext): void {
  const { sessionPhase, isPaused, snapshot, updateSnapshot, onPause } = context;

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
        const current = snapshotRef.current.liveCopyState?.typedString || '';
        updateSnapshot({
          liveCopyState: { typedString: current.slice(0, -1) }
        });
        return;
      }

      // Handle character input
      if (e.key.length === 1) {
        e.preventDefault();
        const current = snapshotRef.current.liveCopyState?.typedString || '';
        updateSnapshot({
          liveCopyState: { typedString: current + e.key.toUpperCase() }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionPhase, isPaused, updateSnapshot, onPause]);
}

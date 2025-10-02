/**
 * Practice Mode - UI Components
 *
 * React components and hooks for Practice mode interface.
 */

/* eslint-disable react-refresh/only-export-components */

import { useEffect } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import type { InputBus } from '../../runtime/inputBus';
import { CharacterDisplay } from '../../../../components/CharacterDisplay';
import { historyToDisplay } from '../../../../components/CharacterDisplay.transformations';

/**
 * Display component for Practice mode
 * Shows character history with correct/incorrect/timeout results
 */
export function PracticeDisplay({ snapshot }: { snapshot: SessionSnapshot }) {
  return (
    <CharacterDisplay
      characters={historyToDisplay(snapshot.previous)}
    />
  );
}

/**
 * Keyboard input hook for Practice mode
 * Captures single-character input and forwards to InputBus
 */
export function usePracticeInput(
  input: InputBus,
  sessionPhase: 'waiting' | 'countdown' | 'active',
  isPaused: boolean,
  onPause?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle pause
      if (e.key === 'Escape' && onPause && sessionPhase === 'active') {
        onPause();
        return;
      }

      // Only capture input during active session
      if (sessionPhase === 'active' && !isPaused && e.key.length === 1) {
        input.push({ at: performance.now(), key: e.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, sessionPhase, isPaused, onPause]);
}

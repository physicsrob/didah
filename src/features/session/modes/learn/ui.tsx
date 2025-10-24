/**
 * Learn Mode UI Components
 *
 * React components for Learn Mode interface with adaptive reveal.
 * Large character display with flash feedback and progress counter.
 */

/* eslint-disable react-refresh/only-export-components */

import { useEffect } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import type { UIContext } from '../shared/types';
import './learn.css';

/**
 * Display component for Learn Mode
 * Shows large character with flash feedback and progress counter
 */
export function LearnDisplay({ snapshot }: { snapshot: SessionSnapshot }) {
  const state = snapshot.learnState;

  // Show nothing if no state
  if (!state) {
    return <div className="learn-display"></div>;
  }

  const { displayChar, flashState, currentIndex, practiceSequence } = state;
  const total = practiceSequence.length;
  const current = currentIndex + 1; // 1-based for display

  return (
    <div className="learn-display">
      <CharacterDisplay
        char={displayChar}
        flashState={flashState}
      />
      <ProgressCounter current={current} total={total} />
    </div>
  );
}

/**
 * Large character display with flash animations
 */
function CharacterDisplay({
  char,
  flashState
}: {
  char: string | null;
  flashState: 'correct' | 'incorrect' | null;
}) {
  let className = 'learn-character';

  if (flashState === 'correct') {
    className += ' learn-character-flash-correct';
  } else if (flashState === 'incorrect') {
    className += ' learn-character-flash-incorrect';
  }

  return (
    <div className={className}>
      {char || ''}
    </div>
  );
}

/**
 * Progress counter showing current position
 */
function ProgressCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="learn-progress">
      {current} / {total}
    </div>
  );
}

/**
 * Keyboard input hook for Learn Mode
 * Captures single-character input and forwards to InputBus
 */
export function useLearnInput(context: UIContext) {
  const { input, sessionPhase, isPaused, onPause } = context;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle pause
      if (e.key === 'Escape' && onPause && sessionPhase === 'active') {
        onPause();
        return;
      }

      // Only capture single-character input during active session
      if (sessionPhase === 'active' && !isPaused && e.key.length === 1) {
        input.push({ at: performance.now(), key: e.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, sessionPhase, isPaused, onPause]);
}

/**
 * Head Copy Mode - UI Components
 *
 * React components for Head Copy mode interface.
 * Displays 3 buttons with word options.
 */

/* eslint-disable react-refresh/only-export-components */

import { useEffect } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import type { UIContext } from '../shared/types';
import './headCopy.css';

/**
 * Display component for Head Copy mode
 * Shows 3 buttons with word choices (pre-shuffled by handler)
 */
export function HeadCopyDisplay({ snapshot }: { snapshot: SessionSnapshot }) {
  const state = snapshot.headCopyState;

  const { buttonWords, flashResult, clickedWord } = state || {};

  // Show nothing while playing or if no current word
  if (!state || state.isPlaying || !state.currentWord) {
    return <div className="head-copy-display"></div>;
  }

  // Use pre-shuffled button order from state (shuffled once in handler, stable across renders)
  const buttons = buttonWords || [];

  return (
    <div className="head-copy-display">
      <div className="head-copy-buttons">
        {buttons.map((word, index) => (
          <WordButton
            key={index}
            word={word}
            flashResult={flashResult ?? null}
            clickedWord={clickedWord ?? null}
            disabled={false}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual word button component
 */
function WordButton({
  word,
  flashResult,
  clickedWord,
  disabled
}: {
  word: string;
  flashResult: 'correct' | 'incorrect' | null;
  clickedWord: string | null;
  disabled: boolean;
}) {
  let className = 'head-copy-button';

  // Apply flash styling only to the clicked button
  const isClickedButton = clickedWord === word;
  if (isClickedButton && flashResult === 'correct') {
    className += ' head-copy-button-flash-correct';
  } else if (isClickedButton && flashResult === 'incorrect') {
    className += ' head-copy-button-flash-incorrect';
  }

  return (
    <button
      className={className}
      disabled={disabled}
      data-word={word}
    >
      {word}
    </button>
  );
}

/**
 * Keyboard and click input hook for Head Copy mode
 * Captures button clicks and forwards to InputBus
 */
export function useHeadCopyInput(context: UIContext) {
  const { input, sessionPhase, isPaused, onPause } = context;

  useEffect(() => {
    // Handle keyboard events (Escape for pause)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onPause && sessionPhase === 'active') {
        onPause();
        return;
      }
    };

    // Handle button clicks
    const handleClick = (e: MouseEvent) => {
      // Only capture clicks during active session
      if (sessionPhase !== 'active' || isPaused) {
        return;
      }

      // Check if click is on a word button
      const target = e.target as HTMLElement;
      if (target.classList.contains('head-copy-button') && !target.hasAttribute('disabled')) {
        const word = target.getAttribute('data-word');
        if (word) {
          // Send word as input event
          input.push({ at: performance.now(), key: word });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [input, sessionPhase, isPaused, onPause]);
}

/**
 * Word Practice Mode - UI Components
 *
 * React components for Word Practice mode interface.
 * Displays 3 buttons with word options.
 */

/* eslint-disable react-refresh/only-export-components */

import { useEffect } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import type { UIContext } from '../shared/types';
import './wordPractice.css';

/**
 * Display component for Word Practice mode
 * Shows 3 buttons with word choices (pre-shuffled by handler)
 */
export function WordPracticeDisplay({ snapshot }: { snapshot: SessionSnapshot }) {
  const state = snapshot.wordPracticeState;

  const { currentWord, buttonWords, flashResult, clickedWord } = state || {};

  // Debug logging
  console.log('[WordPractice UI] Render - state:', state);
  console.log('[WordPractice UI] currentWord:', currentWord, 'buttonWords:', buttonWords, 'isPlaying:', state?.isPlaying);

  // Show nothing while playing or if no current word
  if (!state || state.isPlaying || !state.currentWord) {
    console.log('[WordPractice UI] Returning empty - state check:', {
      hasState: !!state,
      isPlaying: state?.isPlaying,
      hasCurrentWord: !!state?.currentWord
    });
    return <div className="word-practice-display"></div>;
  }

  // Use pre-shuffled button order from state (shuffled once in handler, stable across renders)
  const buttons = buttonWords || [];
  console.log('[WordPractice UI] Rendering buttons:', buttons);

  return (
    <div className="word-practice-display">
      <div className="word-practice-buttons">
        {buttons.map((word, index) => (
          <WordButton
            key={index}
            word={word}
            flashResult={flashResult ?? null}
            clickedWord={clickedWord ?? null}
            disabled={flashResult !== null && flashResult !== undefined}
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
  let className = 'word-practice-button';

  // Apply flash styling only to the clicked button
  const isClickedButton = clickedWord === word;
  if (isClickedButton && flashResult === 'correct') {
    className += ' word-practice-button-flash-correct';
    console.log(`[WordButton] Applying CORRECT flash to button '${word}'`);
  } else if (isClickedButton && flashResult === 'incorrect') {
    className += ' word-practice-button-flash-incorrect';
    console.log(`[WordButton] Applying INCORRECT flash to button '${word}'`);
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
 * Keyboard and click input hook for Word Practice mode
 * Captures button clicks and forwards to InputBus
 */
export function useWordPracticeInput(context: UIContext) {
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
      if (target.classList.contains('word-practice-button') && !target.hasAttribute('disabled')) {
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

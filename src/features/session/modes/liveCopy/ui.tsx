/**
 * Live Copy Mode - UI Components
 *
 * React components and hooks for Live Copy mode interface.
 */

/* eslint-disable react-refresh/only-export-components */

import { useState, useEffect, useMemo } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import { CharacterDisplay, type DisplayCharacter } from '../../../../components/CharacterDisplay';

/**
 * Display component for Live Copy mode
 * Shows what the user has typed (no corrections until session end)
 */
export function LiveCopyDisplay({
  typedString
}: {
  snapshot: SessionSnapshot;
  typedString?: string;
}) {
  const characters = useMemo((): DisplayCharacter[] => {
    return (typedString || '').split('').map((char, i) => ({
      text: char,
      status: 'neutral' as const,
      key: i
    }));
  }, [typedString]);

  return <CharacterDisplay characters={characters} />;
}

/**
 * Keyboard input hook for Live Copy mode
 * Manages typed string with backspace support
 * Returns the typed string for the mode to use
 */
export function useLiveCopyInput(
  _input: unknown, // Not used for Live Copy - it manages its own state
  sessionPhase: 'waiting' | 'countdown' | 'active',
  isPaused: boolean,
  onPause?: () => void
): string {
  const [typedString, setTypedString] = useState('');

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
        setTypedString(prev => prev.slice(0, -1));
        return;
      }

      // Handle character input
      if (e.key.length === 1) {
        e.preventDefault();
        setTypedString(prev => prev + e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionPhase, isPaused, onPause]);

  return typedString;
}

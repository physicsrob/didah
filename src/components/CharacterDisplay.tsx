/**
 * Generic Character Display Component
 *
 * A reusable component for displaying a sequence of characters with visual status.
 * Used by multiple modes (Practice, Listen, Live Copy) with different transformations.
 */

import { useRef, useEffect } from 'react';
import './CharacterDisplay.css';

/**
 * Visual status for a displayed character
 */
export type CharacterStatus =
  | 'correct'    // Green - user input was correct
  | 'incorrect'  // Red - user input was wrong
  | 'missed'     // Light red - no input when expected
  | 'pending'    // Gray - awaiting evaluation
  | 'neutral';   // Default - no evaluation (e.g., listen mode)

/**
 * A single character to display
 */
export interface DisplayCharacter {
  /** The text to display (single char or underscore for missing) */
  text: string;
  /** Visual status determining the color/style */
  status: CharacterStatus;
  /** Optional unique key for React rendering */
  key?: string | number;
}

/**
 * Props for the CharacterDisplay component
 */
export interface CharacterDisplayProps {
  /** Array of characters to display */
  characters: DisplayCharacter[];
  /** Placeholder text when no characters */
  placeholder?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether to auto-scroll to the latest character */
  autoScroll?: boolean;
}

/**
 * Get CSS class for a character status
 */
function getStatusClass(status: CharacterStatus): string {
  switch (status) {
    case 'correct':
      return 'char-correct';     // Green
    case 'incorrect':
      return 'char-incorrect';   // Red
    case 'missed':
      return 'char-timeout';     // Light red (reusing timeout style)
    case 'pending':
      return 'char-pending';     // Gray
    case 'neutral':
    default:
      return 'char-listen';      // Default/neutral color
  }
}

/**
 * Generic character display component
 *
 * Displays a horizontal sequence of characters with color-coded status.
 * Automatically scrolls to show the latest characters as they're added.
 */
export function CharacterDisplay({
  characters,
  placeholder = '',
  className = '',
  autoScroll = true
}: CharacterDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the right when characters change
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [characters, autoScroll]);

  return (
    <div className={`character-history-container ${className}`}>
      <div className="character-history-text" ref={scrollRef}>
        {characters.length === 0 ? (
          <>
            {placeholder && <span className="history-placeholder">{placeholder}</span>}
            <span className="blinking-cursor" />
          </>
        ) : (
          characters.map((char, i) => (
            <span
              key={char.key ?? i}
              className={`${getStatusClass(char.status)} ${i === characters.length - 1 ? 'char-current' : ''}`}
            >
              {char.text}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
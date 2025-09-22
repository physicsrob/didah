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
 * Group characters into words for wrapping
 * Words are separated by spaces, and each word maintains its character styling
 */
function groupIntoWords(characters: DisplayCharacter[]): Array<{
  chars: DisplayCharacter[];
  indices: number[];
  isSpace: boolean;
}> {
  const words: Array<{
    chars: DisplayCharacter[];
    indices: number[];
    isSpace: boolean;
  }> = [];

  let currentWord: DisplayCharacter[] = [];
  let currentIndices: number[] = [];

  characters.forEach((char, index) => {
    if (char.text === ' ') {
      // Flush current word if any
      if (currentWord.length > 0) {
        words.push({
          chars: currentWord,
          indices: currentIndices,
          isSpace: false
        });
        currentWord = [];
        currentIndices = [];
      }
      // Add space as its own "word"
      words.push({
        chars: [char],
        indices: [index],
        isSpace: true
      });
    } else {
      // Add to current word
      currentWord.push(char);
      currentIndices.push(index);
    }
  });

  // Flush final word if any
  if (currentWord.length > 0) {
    words.push({
      chars: currentWord,
      indices: currentIndices,
      isSpace: false
    });
  }

  return words;
}

/**
 * Generic character display component
 *
 * Displays characters with color-coded status in a multi-line format.
 * Wraps at word boundaries and automatically scrolls to show the latest line.
 */
export function CharacterDisplay({
  characters,
  placeholder = '',
  className = '',
  autoScroll = true
}: CharacterDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when characters change
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [characters, autoScroll]);

  // Group characters into words for proper wrapping
  const words = groupIntoWords(characters);
  const lastCharIndex = characters.length - 1;

  return (
    <div className={`character-history-container ${className}`}>
      <div className="character-history-text" ref={scrollRef}>
        {characters.length === 0 ? (
          <>
            {placeholder && <span className="history-placeholder">{placeholder}</span>}
            <span className="blinking-cursor" />
          </>
        ) : (
          <div className="character-words-wrapper">
            {words.map((word, wordIndex) => (
              <span
                key={wordIndex}
                className={`character-word ${word.isSpace ? 'word-space' : ''}`}
              >
                {word.chars.map((char, charIndex) => {
                  const globalIndex = word.indices[charIndex];
                  const isLast = globalIndex === lastCharIndex;
                  return (
                    <span
                      key={char.key ?? globalIndex}
                      className={`${getStatusClass(char.status)} ${isLast ? 'char-current' : ''}`}
                    >
                      {char.text}
                    </span>
                  );
                })}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
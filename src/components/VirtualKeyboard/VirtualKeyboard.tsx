/**
 * Virtual Keyboard Component
 *
 * Touch-optimized on-screen keyboard for mobile devices.
 * Shows full QWERTY layout with numbers and punctuation.
 * All keys are always enabled across all modes.
 */

import { useCallback } from 'react';
import './VirtualKeyboard.css';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
}

const KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.'],
  ['Backspace', 'Space', '?', '/', '=']
] as const;

/**
 * Virtual keyboard component for mobile touch input
 */
export function VirtualKeyboard({ onKeyPress }: VirtualKeyboardProps) {
  const handleKeyPress = useCallback((key: string) => {
    // Convert special keys to their character equivalents
    let keyToSend = key;
    if (key === 'Space') {
      keyToSend = ' ';
    }

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    onKeyPress(keyToSend);
  }, [onKeyPress]);

  return (
    <div className="virtual-keyboard">
      {KEYBOARD_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} className={`keyboard-row keyboard-row-${rowIndex + 1}`}>
          {row.map((key) => {
            const isSpace = key === 'Space';
            const isBackspace = key === 'Backspace';

            let displayKey: string = key;
            if (isBackspace) {
              displayKey = '←';
            } else if (isSpace) {
              displayKey = 'SPACE';
            }

            // Determine key type for styling
            let keyClass = 'keyboard-key';
            if (isSpace) {
              keyClass += ' keyboard-key-space';
            } else if (isBackspace) {
              keyClass += ' keyboard-key-backspace';
            } else if (['1','2','3','4','5','6','7','8','9','0'].includes(key)) {
              keyClass += ' keyboard-key-number';
            } else if ([',', '.', '?', '/', '='].includes(key)) {
              keyClass += ' keyboard-key-punctuation';
            }

            return (
              <button
                key={key}
                className={keyClass}
                onClick={() => handleKeyPress(key)}
                onTouchStart={(e) => {
                  // Prevent default to avoid any scroll or zoom behavior
                  e.preventDefault();
                }}
              >
                {displayKey}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

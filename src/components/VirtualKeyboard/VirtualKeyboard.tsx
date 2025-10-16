/**
 * Virtual Keyboard Component
 *
 * Touch-optimized on-screen keyboard for mobile devices.
 * Shows full QWERTY layout with numbers and punctuation.
 * Keys are enabled/disabled based on current practice alphabet.
 */

import { useCallback } from 'react';
import type { SessionMode } from '../../core/types/domain';
import './VirtualKeyboard.css';

interface VirtualKeyboardProps {
  alphabet: string[];
  onKeyPress: (key: string) => void;
  mode: SessionMode;
}

const KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
  ['.', ',', '?', '/', '=', 'Space']
] as const;

/**
 * Determines if a key should be enabled based on the current alphabet and mode
 */
function isKeyEnabled(key: string, alphabet: string[], mode: SessionMode): boolean {
  // Backspace is only enabled in Live Copy mode
  if (key === 'Backspace') {
    return mode === 'live-copy';
  }

  // Space is enabled in Live Copy and Runner modes
  if (key === 'Space') {
    return mode === 'live-copy' || mode === 'runner';
  }

  // Other keys are enabled if they're in the practice alphabet
  return alphabet.includes(key);
}

/**
 * Virtual keyboard component for mobile touch input
 */
export function VirtualKeyboard({ alphabet, onKeyPress, mode }: VirtualKeyboardProps) {
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
        <div key={rowIndex} className="keyboard-row">
          {row.map((key) => {
            const enabled = isKeyEnabled(key, alphabet, mode);
            const isSpace = key === 'Space';
            const isBackspace = key === 'Backspace';

            let displayKey: string = key;
            if (isBackspace) {
              displayKey = '⌫';
            } else if (isSpace) {
              displayKey = '';
            }

            return (
              <button
                key={key}
                className={`
                  keyboard-key
                  ${enabled ? 'keyboard-key-enabled' : 'keyboard-key-disabled'}
                  ${isSpace ? 'keyboard-key-space' : ''}
                  ${isBackspace ? 'keyboard-key-backspace' : ''}
                `}
                disabled={!enabled}
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

/**
 * Morse Code Alphabet
 *
 * Character to dit/dah pattern mappings following international Morse code standard
 */

export type MorsePattern = readonly ('.' | '-')[];

/**
 * Morse code alphabet with dit/dah patterns
 */
export const MORSE_ALPHABET: Record<string, MorsePattern> = {
  // Letters
  'A': ['.', '-'],
  'B': ['-', '.', '.', '.'],
  'C': ['-', '.', '-', '.'],
  'D': ['-', '.', '.'],
  'E': ['.'],
  'F': ['.', '.', '-', '.'],
  'G': ['-', '-', '.'],
  'H': ['.', '.', '.', '.'],
  'I': ['.', '.'],
  'J': ['.', '-', '-', '-'],
  'K': ['-', '.', '-'],
  'L': ['.', '-', '.', '.'],
  'M': ['-', '-'],
  'N': ['-', '.'],
  'O': ['-', '-', '-'],
  'P': ['.', '-', '-', '.'],
  'Q': ['-', '-', '.', '-'],
  'R': ['.', '-', '.'],
  'S': ['.', '.', '.'],
  'T': ['-'],
  'U': ['.', '.', '-'],
  'V': ['.', '.', '.', '-'],
  'W': ['.', '-', '-'],
  'X': ['-', '.', '.', '-'],
  'Y': ['-', '.', '-', '-'],
  'Z': ['-', '-', '.', '.'],

  // Numbers
  '0': ['-', '-', '-', '-', '-'],
  '1': ['.', '-', '-', '-', '-'],
  '2': ['.', '.', '-', '-', '-'],
  '3': ['.', '.', '.', '-', '-'],
  '4': ['.', '.', '.', '.', '-'],
  '5': ['.', '.', '.', '.', '.'],
  '6': ['-', '.', '.', '.', '.'],
  '7': ['-', '-', '.', '.', '.'],
  '8': ['-', '-', '-', '.', '.'],
  '9': ['-', '-', '-', '-', '.'],

  // Standard punctuation
  ',': ['-', '-', '.', '.', '-', '-'],
  '.': ['.', '-', '.', '-', '.', '-'],
  '/': ['-', '.', '.', '-', '.'],
  '=': ['-', '.', '.', '.', '-'],
  '?': ['.', '.', '-', '-', '.', '.'],

  // Advanced punctuation
  ':': ['-', '-', '-', '.', '.', '.'],
  ';': ['-', '.', '-', '.', '-', '.'],
  '(': ['-', '.', '-', '-', '.'],
  ')': ['-', '.', '-', '-', '.', '-'],
  '"': ['.', '-', '.', '.', '-', '.'],
  "'": ['.', '-', '-', '-', '-', '.'],
  '-': ['-', '.', '.', '.', '.', '-'],
  '+': ['.', '-', '.', '-', '.'],
  '@': ['.', '-', '-', '.', '-', '.'],
} as const;

/**
 * Get the Morse pattern for a character (case insensitive)
 */
export function getMorsePattern(char: string): MorsePattern | undefined {
  return MORSE_ALPHABET[char.toUpperCase()];
}

/**
 * Check if a character has a known Morse pattern
 */
export function isMorseCharacter(char: string): boolean {
  return char.toUpperCase() in MORSE_ALPHABET;
}

/**
 * Get all available characters by category
 * Derives punctuation lists from MORSE_ALPHABET to maintain single source of truth
 */
export function getCharactersByCategory() {
  const chars = Object.keys(MORSE_ALPHABET);

  // Define which punctuation is "standard" vs "advanced"
  const standardPunct = [',', '.', '/', '=', '?'];

  return {
    letters: chars.filter(c => /[A-Z]/.test(c)),
    numbers: chars.filter(c => /[0-9]/.test(c)),
    standardPunctuation: standardPunct,
    advancedPunctuation: chars.filter(c =>
      !/[A-Z0-9]/.test(c) && !standardPunct.includes(c)
    ),
  };
}
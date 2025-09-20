/**
 * Morse Code Alphabet
 *
 * Character to dit/dah pattern mappings following international Morse code standard
 */

export type MorsePattern = readonly ('dit' | 'dah')[];

/**
 * Morse code alphabet with dit/dah patterns
 */
export const MORSE_ALPHABET: Record<string, MorsePattern> = {
  // Letters
  'A': ['dit', 'dah'],
  'B': ['dah', 'dit', 'dit', 'dit'],
  'C': ['dah', 'dit', 'dah', 'dit'],
  'D': ['dah', 'dit', 'dit'],
  'E': ['dit'],
  'F': ['dit', 'dit', 'dah', 'dit'],
  'G': ['dah', 'dah', 'dit'],
  'H': ['dit', 'dit', 'dit', 'dit'],
  'I': ['dit', 'dit'],
  'J': ['dit', 'dah', 'dah', 'dah'],
  'K': ['dah', 'dit', 'dah'],
  'L': ['dit', 'dah', 'dit', 'dit'],
  'M': ['dah', 'dah'],
  'N': ['dah', 'dit'],
  'O': ['dah', 'dah', 'dah'],
  'P': ['dit', 'dah', 'dah', 'dit'],
  'Q': ['dah', 'dah', 'dit', 'dah'],
  'R': ['dit', 'dah', 'dit'],
  'S': ['dit', 'dit', 'dit'],
  'T': ['dah'],
  'U': ['dit', 'dit', 'dah'],
  'V': ['dit', 'dit', 'dit', 'dah'],
  'W': ['dit', 'dah', 'dah'],
  'X': ['dah', 'dit', 'dit', 'dah'],
  'Y': ['dah', 'dit', 'dah', 'dah'],
  'Z': ['dah', 'dah', 'dit', 'dit'],

  // Numbers
  '0': ['dah', 'dah', 'dah', 'dah', 'dah'],
  '1': ['dit', 'dah', 'dah', 'dah', 'dah'],
  '2': ['dit', 'dit', 'dah', 'dah', 'dah'],
  '3': ['dit', 'dit', 'dit', 'dah', 'dah'],
  '4': ['dit', 'dit', 'dit', 'dit', 'dah'],
  '5': ['dit', 'dit', 'dit', 'dit', 'dit'],
  '6': ['dah', 'dit', 'dit', 'dit', 'dit'],
  '7': ['dah', 'dah', 'dit', 'dit', 'dit'],
  '8': ['dah', 'dah', 'dah', 'dit', 'dit'],
  '9': ['dah', 'dah', 'dah', 'dah', 'dit'],

  // Standard punctuation
  ',': ['dah', 'dah', 'dit', 'dit', 'dah', 'dah'],
  '.': ['dit', 'dah', 'dit', 'dah', 'dit', 'dah'],
  '/': ['dah', 'dit', 'dit', 'dah', 'dit'],
  '=': ['dah', 'dit', 'dit', 'dit', 'dah'],
  '?': ['dit', 'dit', 'dah', 'dah', 'dit', 'dit'],

  // Advanced punctuation
  ':': ['dah', 'dah', 'dah', 'dit', 'dit', 'dit'],
  ';': ['dah', 'dit', 'dah', 'dit', 'dah', 'dit'],
  '(': ['dah', 'dit', 'dah', 'dah', 'dit'],
  ')': ['dah', 'dit', 'dah', 'dah', 'dit', 'dah'],
  '"': ['dit', 'dah', 'dit', 'dit', 'dah', 'dit'],
  "'": ['dit', 'dah', 'dah', 'dah', 'dah', 'dit'],
  '-': ['dah', 'dit', 'dit', 'dit', 'dit', 'dah'],
  '+': ['dit', 'dah', 'dit', 'dah', 'dit'],
  '@': ['dit', 'dah', 'dah', 'dit', 'dah', 'dit'],
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
 */
export function getCharactersByCategory() {
  const chars = Object.keys(MORSE_ALPHABET);

  return {
    letters: chars.filter(c => /[A-Z]/.test(c)),
    numbers: chars.filter(c => /[0-9]/.test(c)),
    standardPunctuation: [',', '.', '/', '=', '?'],
    advancedPunctuation: [':', ';', '(', ')', '"', "'", '-', '+', '@'],
  };
}
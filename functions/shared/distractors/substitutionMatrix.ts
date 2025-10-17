/**
 * Character substitution matrix for fallback distractor generation
 *
 * Maps each Morse character to similar characters based on Morse pattern similarity.
 * Used when word-based distractor generation isn't applicable (numbers, punctuation, mixed content).
 */

export const SUBSTITUTION_MATRIX: Record<string, string[]> = {
  // Numbers (based on morse pattern similarity)
  // Numbers follow a predictable pattern: 1-5 have increasing dits, 6-0 have increasing dahs
  '0': ['9', '8', 'O'],           // ----- → similar to 4 dahs, 3 dahs
  '1': ['2', 'J', 'Q'],           // .---- → similar to 2 dits + dahs, similar starts
  '2': ['1', '3', 'U'],           // ..--- → similar digit neighbors, 2 dits + dah
  '3': ['2', '4', 'V'],           // ...-- → similar digit neighbors, 3 dits + dah
  '4': ['3', '5', 'H'],           // ....- → similar digit neighbors, 4 dits
  '5': ['4', '6', 'S'],           // ..... → similar digit neighbors, 5 dits vs 3-4 dits
  '6': ['5', '7', 'B'],           // -.... → similar digit neighbors, dah + dits
  '7': ['6', '8', 'Z'],           // --... → similar digit neighbors, 2 dahs + dits
  '8': ['7', '9', 'O'],           // ---.. → similar digit neighbors, 3 dahs
  '9': ['0', '8', 'Q'],           // ----. → similar to 5 dahs, 3 dahs

  // Letters (based on morse pattern similarity)
  'A': ['N', 'R', 'W'],           // .- → inverted N, extended with dit/dah
  'B': ['D', '6', 'V'],           // -... → similar dah + dits pattern
  'C': ['K', 'Y', 'R'],           // -.-. → similar dit-dah alternation
  'D': ['B', 'N', 'X'],           // -.. → similar dah + dits, shorter/longer versions
  'E': ['I', 'T', 'S'],           // . → extended to 2 dits, inverted, or 3 dits
  'F': ['L', 'U', 'R'],           // ..-. → similar dit patterns
  'G': ['M', 'Z', 'O'],           // --. → similar dah patterns
  'H': ['S', '5', '4'],           // .... → 4 dits vs 3-5 dits
  'I': ['E', 'S', 'U'],           // .. → shorter/longer dit sequences
  'J': ['1', 'W', 'P'],           // .--- → dit + dahs pattern
  'K': ['C', 'N', 'R'],           // -.- → similar alternating pattern
  'L': ['R', 'F', 'A'],           // .-.. → similar dit-dah patterns
  'M': ['N', 'T', 'O'],           // -- → 2 dahs vs 1 or 3 dahs
  'N': ['M', 'T', 'D'],           // -. → similar short patterns
  'O': ['M', '0', '8'],           // --- → 3 dahs vs 2 dahs or 5 dahs
  'P': ['W', 'J', 'A'],           // .--. → dit + dahs pattern
  'Q': ['G', 'Z', 'Y'],           // --.- → dah + dah patterns
  'R': ['A', 'L', 'K'],           // .-. → similar alternating pattern
  'S': ['E', 'I', 'H'],           // ... → 3 dits vs 1, 2, or 4 dits
  'T': ['M', 'N', 'E'],           // - → single dah vs similar short patterns
  'U': ['V', 'I', 'F'],           // ..- → 2 dits + dah vs similar
  'V': ['U', '4', 'B'],           // ...- → 3 dits + dah vs similar
  'W': ['A', 'J', 'P'],           // .-- → dit + 2 dahs vs similar
  'X': ['D', 'B', 'K'],           // -..- → mixed dit-dah pattern
  'Y': ['K', 'C', 'Q'],           // -.-- → dah + dit + dahs
  'Z': ['G', 'Q', '7'],           // --.. → 2 dahs + dits vs similar

  // Standard punctuation (based on morse pattern similarity)
  ',': ['Z', 'G', 'Q'],           // --..-- → shares start with Z, G
  '.': ['R', 'L', '+'],           // .-.-.- → alternating pattern like R
  '/': ['B', 'D', '='],           // -..-. → similar to B, D patterns
  '=': ['B', 'D', '/'],           // -...- → similar dah + dits
  '?': ['2', 'U', 'W'],           // ..--.. → starts like 2, U

  // Advanced punctuation (based on morse pattern similarity)
  ':': ['O', '8', '0'],           // ---... → starts with 3 dahs
  ';': ['C', 'K', 'Y'],           // -.-.-. → extended alternating pattern
  '(': ['Y', 'K', 'Q'],           // -.-- → same as Y
  ')': ['Y', 'K', '('],           // -.--.- → similar to Y and (
  '"': ['L', 'R', 'F'],           // .-..-. → similar dit-dah pattern
  "'": ['1', 'J', '0'],           // .----. → dit + dahs like 1, J
  '-': ['B', '6', 'D'],           // -....- → dah + dits pattern
  '+': ['.', 'R', 'L'],           // .-.-. → alternating like period
  '@': ['W', 'P', 'A'],           // .--.-. → dit + dahs like W, P
} as const;

/**
 * Check if a character has a substitution mapping
 */
export function hasSubstitution(char: string): boolean {
  return char.toUpperCase() in SUBSTITUTION_MATRIX;
}

/**
 * Get substitution candidates for a character
 * Returns empty array if character not in matrix
 */
export function getSubstitutes(char: string): string[] {
  const upper = char.toUpperCase();
  return SUBSTITUTION_MATRIX[upper] || [];
}

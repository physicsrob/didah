/**
 * Koch Method implementation for Learn Mode
 *
 * The Koch method introduces 2 characters at a time, building up from a small set.
 * Each level includes all characters from previous levels plus 2 new ones.
 */

/**
 * Standard Koch sequence (40 characters total)
 * 2 characters per level = 20 levels
 */
export const KOCH_SEQUENCE = [
  'K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O',
  'W', 'I', '.', 'N', 'J', 'E', 'F', '0', 'Y', ',',
  'V', 'G', '5', '/', 'Q', '9', 'Z', 'H', '3', '8',
  'B', '?', '4', '2', '7', 'C', '1', 'D', '6', 'X'
] as const

export const TOTAL_LEVELS = 20
export const CHARACTERS_PER_LEVEL = 2
export const PRACTICE_SESSION_LENGTH = 20

/**
 * Validates that a level number is within valid range (1-20)
 */
export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= TOTAL_LEVELS
}

/**
 * Gets all characters for a given level (cumulative from level 1 through the given level)
 *
 * @param level Level number (1-20)
 * @returns Array of all characters up to and including this level
 * @throws Error if level is invalid
 *
 * @example
 * getCharactersForLevel(1) // ['K', 'M']
 * getCharactersForLevel(2) // ['K', 'M', 'R', 'S']
 * getCharactersForLevel(3) // ['K', 'M', 'R', 'S', 'U', 'A']
 */
export function getCharactersForLevel(level: number): string[] {
  if (!isValidLevel(level)) {
    throw new Error(`Invalid level: ${level}. Must be between 1 and ${TOTAL_LEVELS}`)
  }

  const endIndex = level * CHARACTERS_PER_LEVEL
  return KOCH_SEQUENCE.slice(0, endIndex) as unknown as string[]
}

/**
 * Gets only the newly introduced characters for a given level
 *
 * @param level Level number (1-20)
 * @returns Array of the 2 new characters introduced at this level
 * @throws Error if level is invalid
 *
 * @example
 * getNewCharactersForLevel(1) // ['K', 'M']
 * getNewCharactersForLevel(2) // ['R', 'S']
 * getNewCharactersForLevel(3) // ['U', 'A']
 */
export function getNewCharactersForLevel(level: number): string[] {
  if (!isValidLevel(level)) {
    throw new Error(`Invalid level: ${level}. Must be between 1 and ${TOTAL_LEVELS}`)
  }

  const startIndex = (level - 1) * CHARACTERS_PER_LEVEL
  const endIndex = level * CHARACTERS_PER_LEVEL
  return KOCH_SEQUENCE.slice(startIndex, endIndex) as unknown as string[]
}

/**
 * Gets a human-readable description of a level
 *
 * @param level Level number (1-20)
 * @returns String description like "Level 3: K M R S U A"
 * @throws Error if level is invalid
 */
export function getLevelDescription(level: number): string {
  const chars = getCharactersForLevel(level)
  return `Level ${level}: ${chars.join(' ')}`
}

/**
 * Gets a human-readable description of new characters in a level
 *
 * @param level Level number (1-20)
 * @returns String description like "Level 3 (+U +A)"
 * @throws Error if level is invalid
 */
export function getNewCharactersDescription(level: number): string {
  const newChars = getNewCharactersForLevel(level)
  return `Level ${level} (+${newChars.join(' +')})`
}

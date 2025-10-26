/**
 * Koch Method implementation for Learn Mode
 *
 * The Koch method introduces 2 characters at a time, building up from a small set.
 * Each lesson includes all characters from previous lessons plus 2 new ones.
 */

/**
 * Standard Koch sequence (40 characters total)
 * 2 characters per lesson = 20 lessons
 */
export const KOCH_SEQUENCE = [
  'K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O',
  'W', 'I', '.', 'N', 'J', 'E', 'F', '0', 'Y', ',',
  'V', 'G', '5', '/', 'Q', '9', 'Z', 'H', '3', '8',
  'B', '?', '4', '2', '7', 'C', '1', 'D', '6', 'X'
] as const

export const TOTAL_LESSONS = 20
export const CHARACTERS_PER_LESSON = 2
export const MIN_NEW_CHAR_DRILLS = 5
export const LEARN_SESSION_LENGTH = 30  // Number of characters in a Learn Mode session

/**
 * Validates that a lesson number is within valid range (1-20)
 */
export function isValidLesson(lesson: number): boolean {
  return Number.isInteger(lesson) && lesson >= 1 && lesson <= TOTAL_LESSONS
}

/**
 * Gets all characters for a given lesson (cumulative from lesson 1 through the given lesson)
 *
 * @param lesson Lesson number (1-20)
 * @returns Array of all characters up to and including this lesson
 * @throws Error if lesson is invalid
 *
 * @example
 * getCharactersForLesson(1) // ['K', 'M']
 * getCharactersForLesson(2) // ['K', 'M', 'R', 'S']
 * getCharactersForLesson(3) // ['K', 'M', 'R', 'S', 'U', 'A']
 */
export function getCharactersForLesson(lesson: number): string[] {
  if (!isValidLesson(lesson)) {
    throw new Error(`Invalid lesson: ${lesson}. Must be between 1 and ${TOTAL_LESSONS}`)
  }

  const endIndex = lesson * CHARACTERS_PER_LESSON
  return KOCH_SEQUENCE.slice(0, endIndex) as unknown as string[]
}

/**
 * Gets only the newly introduced characters for a given lesson
 *
 * @param lesson Lesson number (1-20)
 * @returns Array of the 2 new characters introduced at this lesson
 * @throws Error if lesson is invalid
 *
 * @example
 * getNewCharactersForLesson(1) // ['K', 'M']
 * getNewCharactersForLesson(2) // ['R', 'S']
 * getNewCharactersForLesson(3) // ['U', 'A']
 */
export function getNewCharactersForLesson(lesson: number): string[] {
  if (!isValidLesson(lesson)) {
    throw new Error(`Invalid lesson: ${lesson}. Must be between 1 and ${TOTAL_LESSONS}`)
  }

  const startIndex = (lesson - 1) * CHARACTERS_PER_LESSON
  const endIndex = lesson * CHARACTERS_PER_LESSON
  return KOCH_SEQUENCE.slice(startIndex, endIndex) as unknown as string[]
}

/**
 * Gets a human-readable description of a lesson
 *
 * @param lesson Lesson number (1-20)
 * @returns String description like "Lesson 3: K M R S U A"
 * @throws Error if lesson is invalid
 */
export function getLessonDescription(lesson: number): string {
  const chars = getCharactersForLesson(lesson)
  return `Lesson ${lesson}: ${chars.join(' ')}`
}

/**
 * Gets a human-readable description of new characters in a lesson
 *
 * @param lesson Lesson number (1-20)
 * @returns String description like "Lesson 3 (+U +A)"
 * @throws Error if lesson is invalid
 */
export function getNewCharactersDescription(lesson: number): string {
  const newChars = getNewCharactersForLesson(lesson)
  return `Lesson ${lesson} (+${newChars.join(' +')})`
}

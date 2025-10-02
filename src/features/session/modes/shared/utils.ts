/**
 * Shared utilities for session modes
 */

/**
 * Check if a key is a valid morse character
 * Accepts: letters (A-Z), numbers (0-9), and standard punctuation
 */
export function isValidChar(key: string): boolean {
  return /^[A-Za-z0-9.,/=?;:'"+@()\s-]$/.test(key);
}

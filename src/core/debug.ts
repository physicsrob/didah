/**
 * Debug utilities for controlling verbose output
 *
 * Set DEBUG_MORSE=true environment variable to enable debug output
 * Example: DEBUG_MORSE=true npm test
 */

/**
 * Check if debug mode is enabled
 * - In Node.js: checks DEBUG_MORSE environment variable
 * - In browser: enabled in development, disabled in production
 */
export const DEBUG = typeof process !== 'undefined' && process.env
  ? process.env.DEBUG_MORSE === 'true'
  : import.meta.env.DEV

/**
 * Debug logger that only outputs when DEBUG is true
 */
export const debug = {
  /**
   * Log a debug message (only in debug mode)
   */
  log(...args: unknown[]): void {
    if (DEBUG) {
      console.log(...args);
    }
  },

  /**
   * Log an error (always, regardless of debug mode)
   */
  error(...args: unknown[]): void {
    console.error(...args);
  },

  /**
   * Log a warning (always, regardless of debug mode)
   */
  warn(...args: unknown[]): void {
    console.warn(...args);
  }
};

/**
 * Group related debug messages (only in debug mode)
 */
export function debugGroup(label: string, fn: () => void): void {
  if (DEBUG) {
    console.group(label);
    fn();
    console.groupEnd();
  }
}
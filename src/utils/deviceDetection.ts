/**
 * Device Detection Utilities
 *
 * Helpers for detecting device capabilities.
 */

/**
 * Detects if the current device has touch capability.
 * Used to determine whether to show the virtual keyboard.
 *
 * @returns true if the device supports touch input
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

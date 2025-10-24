/**
 * Star Rating Calculation for Learn Mode
 *
 * Calculates star ratings (0-3) based on session accuracy.
 * Used by both frontend (completion page) and backend (if needed).
 */

/**
 * Calculate star rating from accuracy percentage
 *
 * @param accuracy Overall accuracy percentage (0-100)
 * @returns Star rating (0-3)
 *
 * Thresholds:
 * - 3 stars: ≥95% accuracy
 * - 2 stars: ≥90% accuracy
 * - 1 star: ≥85% accuracy
 * - 0 stars: <85% accuracy
 */
export function calculateStars(accuracy: number): number {
  if (accuracy >= 95) return 3
  if (accuracy >= 90) return 2
  if (accuracy >= 85) return 1
  return 0
}

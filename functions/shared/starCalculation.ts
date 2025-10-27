/**
 * Star Rating Calculation for Learn Mode
 *
 * Calculates star ratings (0-3) based on mistake count.
 * Used by both frontend (completion page) and backend (if needed).
 */

import { LEARN_SESSION_LENGTH } from './koch'

/**
 * Calculate star rating from accuracy percentage
 *
 * @param accuracy Overall accuracy percentage (0-100)
 * @returns Star rating (0-3)
 *
 * Thresholds (based on mistakes in a 30-character session):
 * - 3 stars: 0 mistakes (100% accuracy)
 * - 2 stars: 1 mistake (96.67% accuracy)
 * - 1 star: 3 mistakes (90% accuracy)
 * - 0 stars: 4+ mistakes (<90% accuracy)
 */
export function calculateStars(accuracy: number): number {
  // Only perfect 100% accuracy gets 3 stars (0 mistakes)
  if (accuracy >= 100) return 3

  // Calculate number of mistakes from accuracy
  // For non-perfect scores, round up to avoid giving credit for partial mistakes
  const mistakes = Math.ceil((100 - accuracy) * LEARN_SESSION_LENGTH / 100)

  if (mistakes <= 1) return 2
  if (mistakes <= 3) return 1
  return 0
}

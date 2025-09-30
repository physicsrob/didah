/**
 * Session Statistics Types
 *
 * Frontend re-export of shared statistics types from backend.
 * Backend stores as Record (JSON-serializable), frontend uses Maps internally.
 * Conversion happens at API boundaries in statsAPI.ts and api.ts.
 */

// Re-export canonical types from backend (single source of truth)
export type { SessionStatistics, CharacterStatistics, SpeedTier } from '../../../functions/shared/types'

/**
 * Frontend-specific type: SessionStatistics with Maps instead of Records
 * Used internally in frontend for ergonomic access patterns.
 * Converted to/from backend Record format at API boundaries.
 */
export type SessionStatisticsWithMaps = Omit<import('../../../functions/shared/types').SessionStatistics, 'characterStats' | 'confusionMatrix'> & {
  characterStats: Map<string, import('../../../functions/shared/types').CharacterStatistics>
  confusionMatrix: Map<string, Map<string, number>>
}
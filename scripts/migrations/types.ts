/**
 * Migration Framework Types
 *
 * Defines interfaces for the reusable KV migration system.
 */

import type { SessionStatistics } from '../../src/core/types/statistics';

/**
 * Migration definition interface
 */
export interface Migration {
  /** Unique identifier for this migration */
  id: string;

  /** Human-readable description of what this migration does */
  description: string;

  /**
   * Check if a session needs this migration applied.
   * Used for idempotency - migrations can be run multiple times safely.
   */
  needsMigration(session: SessionStatistics): boolean;

  /**
   * Transform a session's statistics.
   * Returns the updated session data.
   */
  transform(session: SessionStatistics): SessionStatistics;

  /**
   * Optional validation to ensure transformation was successful.
   * Throws an error if validation fails.
   */
  validate?(original: SessionStatistics, transformed: SessionStatistics): void;
}

/**
 * Options for running migrations
 */
export interface MigrationOptions {
  /** Target namespace (preview or production) */
  namespace: 'preview' | 'production';

  /** If true, show what would change without modifying data */
  dryRun: boolean;

  /** Enable verbose logging */
  verbose: boolean;

  /** Continue processing if an error occurs */
  continueOnError: boolean;

  /** Maximum number of concurrent operations */
  maxConcurrency: number;

  /** Optional: specific key to migrate (for testing) */
  specificKey?: string;
}

/**
 * Result of a migration run
 */
export interface MigrationResult {
  /** Total keys processed */
  totalKeys: number;

  /** Keys that were migrated */
  migratedKeys: number;

  /** Keys skipped (already migrated) */
  skippedKeys: number;

  /** Keys that had errors */
  errorKeys: number;

  /** Detailed errors by key */
  errors: Map<string, Error>;

  /** Time taken in milliseconds */
  durationMs: number;
}

/**
 * Namespace configuration from wrangler.toml
 */
export interface NamespaceConfig {
  preview: string;
  production: string;
}
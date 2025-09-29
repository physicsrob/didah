#!/usr/bin/env node

/**
 * KV Migration Runner
 *
 * Main entry point for running migrations on Cloudflare KV data.
 *
 * Usage:
 *   npm run migrate -- --transformation 001 --namespace preview --dry-run
 *   npm run migrate -- --transformation 001 --namespace production
 *   npm run migrate -- --transformation 001 --namespace preview --key "user:123:stats:2025-09-28"
 */

import { KVClient } from './kv-client';
import type { Migration, MigrationOptions, MigrationResult } from './types';
import type { SessionStatistics } from '../../src/core/types/statistics';

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions & { transformationId: string } {
  const args = process.argv.slice(2);
  const options: MigrationOptions & { transformationId: string } = {
    transformationId: '',
    namespace: 'preview',
    dryRun: false,
    verbose: false,
    continueOnError: true,
    maxConcurrency: 5,
    specificKey: undefined
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--transformation':
      case '-t':
        options.transformationId = args[++i];
        break;
      case '--namespace':
      case '-n':
        options.namespace = args[++i] as 'preview' | 'production';
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--key':
      case '-k':
        options.specificKey = args[++i];
        break;
      case '--continue-on-error':
        options.continueOnError = true;
        break;
      case '--stop-on-error':
        options.continueOnError = false;
        break;
      case '--concurrency':
        options.maxConcurrency = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  // Validate required arguments
  if (!options.transformationId) {
    console.error('Error: --transformation is required');
    printHelp();
    process.exit(1);
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
KV Migration Runner

Usage: npm run migrate -- [options]

Required:
  -t, --transformation ID    Migration ID to run (e.g., "001")

Options:
  -n, --namespace NAME       Target namespace: "preview" or "production" (default: preview)
  -d, --dry-run             Show what would change without modifying data
  -v, --verbose             Enable verbose logging
  -k, --key KEY             Migrate specific key only (for testing)
  --continue-on-error       Continue if errors occur (default)
  --stop-on-error          Stop on first error
  --concurrency N          Max concurrent operations (default: 5)
  -h, --help               Show this help message

Examples:
  npm run migrate -- -t 001 -n preview --dry-run
  npm run migrate -- -t 001 -n production
  npm run migrate -- -t 001 -n preview -k "user:123:stats:2025-09-28"
  `);
}

/**
 * Load migration module
 */
async function loadMigration(id: string): Promise<Migration> {
  try {
    const module = await import(`./transformations/${id}-separate-timeout-stats.js`);
    return module.migration;
  } catch (error) {
    console.error(`Failed to load migration ${id}:`, error);
    throw new Error(`Migration ${id} not found`);
  }
}

/**
 * Process a single session within a key's data
 */
function processSession(
  session: SessionStatistics,
  migration: Migration,
  dryRun: boolean
): { migrated: boolean; result?: SessionStatistics; error?: Error } {
  try {
    // Check if migration is needed
    if (!migration.needsMigration(session)) {
      return { migrated: false };
    }

    // Transform the session
    const transformed = migration.transform(session);

    // Validate if validator is provided
    if (migration.validate) {
      migration.validate(session, transformed);
    }

    if (!dryRun) {
      return { migrated: true, result: transformed };
    } else {
      // In dry-run, just indicate it would be migrated
      return { migrated: true, result: transformed };
    }
  } catch (error) {
    return { migrated: false, error: error as Error };
  }
}

/**
 * Main migration runner
 */
async function runMigration(): Promise<void> {
  const options = parseArgs();
  const startTime = Date.now();

  console.log('='.repeat(60));
  console.log('KV Migration Runner');
  console.log('='.repeat(60));
  console.log(`Transformation: ${options.transformationId}`);
  console.log(`Namespace: ${options.namespace}`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('='.repeat(60));

  // Load migration
  const migration = await loadMigration(options.transformationId);
  console.log(`\nLoaded migration: ${migration.description}\n`);

  // Initialize KV client
  const client = new KVClient(options.namespace, options.verbose);

  // Get keys to process
  let keys: string[];
  if (options.specificKey) {
    keys = [options.specificKey];
    console.log(`Processing specific key: ${options.specificKey}`);
  } else {
    console.log('Fetching all user stats keys...');
    const allKeys = await client.getAllStatsKeys();
    keys = allKeys.filter(key => key.includes(':stats:'));
    console.log(`Found ${keys.length} stats keys to process\n`);
  }

  // Initialize result tracking
  const result: MigrationResult = {
    totalKeys: keys.length,
    migratedKeys: 0,
    skippedKeys: 0,
    errorKeys: 0,
    errors: new Map(),
    durationMs: 0
  };

  // Process each key
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const progress = `[${i + 1}/${keys.length}]`;

    try {
      if (options.verbose) {
        console.log(`${progress} Processing ${key}...`);
      }

      // Get current data
      const data = await client.getKey(key);
      if (!Array.isArray(data)) {
        throw new Error(`Invalid data format for key ${key}`);
      }

      // Process each session in the array
      let anyMigrated = false;
      const updatedSessions = data.map((session: SessionStatistics) => {
        const { migrated, result: transformed, error } = processSession(session, migration, options.dryRun);

        if (error) {
          console.error(`Error processing session in ${key}:`, error.message);
          if (!options.continueOnError) {
            throw error;
          }
          return session; // Keep original on error
        }

        if (migrated) {
          anyMigrated = true;
          return transformed || session;
        }

        return session;
      });

      if (anyMigrated) {
        if (!options.dryRun) {
          // Write back updated data
          await client.putKey(key, updatedSessions);
        }
        result.migratedKeys++;
        console.log(`${progress} ✅ Migrated ${key}`);
      } else {
        result.skippedKeys++;
        if (options.verbose) {
          console.log(`${progress} ⏭️  Skipped ${key} (already migrated)`);
        }
      }
    } catch (error) {
      result.errorKeys++;
      result.errors.set(key, error as Error);
      console.error(`${progress} ❌ Error processing ${key}:`, (error as Error).message);

      if (!options.continueOnError) {
        throw error;
      }
    }

    // Show progress periodically
    if (!options.verbose && i > 0 && i % 10 === 0) {
      console.log(`Progress: ${i}/${keys.length} keys processed...`);
    }
  }

  // Calculate duration
  result.durationMs = Date.now() - startTime;

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total keys processed: ${result.totalKeys}`);
  console.log(`Keys migrated: ${result.migratedKeys}`);
  console.log(`Keys skipped: ${result.skippedKeys}`);
  console.log(`Keys with errors: ${result.errorKeys}`);
  console.log(`Duration: ${(result.durationMs / 1000).toFixed(2)} seconds`);

  if (result.errors.size > 0) {
    console.log('\nErrors:');
    result.errors.forEach((error, key) => {
      console.log(`  ${key}: ${error.message}`);
    });
  }

  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made');
  }

  console.log('='.repeat(60));

  // Exit with error code if there were errors
  if (result.errorKeys > 0 && !options.continueOnError) {
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
# KV Migration Framework

A reusable system for migrating Cloudflare KV data when statistics calculations or data structures change.

## Quick Start

### Running a Migration

```bash
# Dry run (preview what would change)
npm run migrate -- -t 001 -n preview --dry-run

# Run migration on preview namespace
npm run migrate -- -t 001 -n preview

# Run migration on production namespace
npm run migrate -- -t 001 -n production

# Test on a specific key
npm run migrate -- -t 001 -n preview -k "user:123:stats:2025-09-28"
```

### Command Line Options

- `-t, --transformation ID` - Migration ID to run (required)
- `-n, --namespace NAME` - Target namespace: "preview" or "production" (default: preview)
- `-d, --dry-run` - Show what would change without modifying data
- `-v, --verbose` - Enable verbose logging
- `-k, --key KEY` - Migrate specific key only (for testing)
- `--continue-on-error` - Continue if errors occur (default)
- `--stop-on-error` - Stop on first error
- `--concurrency N` - Max concurrent operations (default: 5)

## Creating New Migrations

1. **Copy the template**:
   ```bash
   cp transformations/000-template.ts.example transformations/002-your-migration.ts
   ```

2. **Implement the migration**:
   ```typescript
   export const migration: Migration = {
     id: '002-your-migration',
     description: 'What this migration does',

     needsMigration(session) {
       // Return true if migration is needed
       return (session as any).yourNewField === undefined;
     },

     transform(session) {
       // Apply your transformation
       return {
         ...session,
         yourNewField: calculateValue(session)
       };
     }
   };
   ```

3. **Update migrate.ts** if needed (line ~93):
   ```typescript
   // Update the import path pattern if your naming differs
   const module = await import(`./transformations/${id}-your-pattern.js`);
   ```

4. **Test your migration**:
   ```bash
   # Test on single key first
   npm run migrate -- -t 002 -n preview -k "user:123:stats:2025-09-28" --dry-run

   # Then run full dry-run
   npm run migrate -- -t 002 -n preview --dry-run
   ```

## Architecture

### Components

- **migrate.ts** - Main runner that orchestrates migrations
- **kv-client.ts** - Wrapper around wrangler KV commands
- **types.ts** - TypeScript interfaces for the migration system
- **transformations/** - Individual migration modules

### How It Works

1. **Discovery**: Lists all KV keys matching `user:*:stats:*`
2. **Processing**: For each key:
   - Fetches the current data (array of sessions)
   - Checks if migration is needed (`needsMigration`)
   - Applies transformation (`transform`)
   - Validates result (`validate` - optional)
   - Updates KV storage (unless dry-run)
3. **Reporting**: Shows summary of migrated, skipped, and error keys

### Safety Features

- **Idempotency**: Migrations can be run multiple times safely
- **Dry-run mode**: Preview changes before applying
- **Validation**: Optional validation step for each transformation
- **Error handling**: Continue or stop on errors
- **Progress tracking**: Real-time progress updates

## Existing Migrations

### 001-separate-timeout-stats
Separates timeout percentage from accuracy calculation:
- Accuracy now excludes timeouts (only counts actual attempts)
- Adds `timeoutPercentage` field
- Updates effective WPM formula to `(correct - incorrect) / seconds * 12`

## Namespace Configuration

Namespaces are configured in `kv-client.ts`:
```typescript
const NAMESPACES = {
  preview: '3278f9e99cc845e9ad224c6fb2366ecb',
  production: '04dedd993bbf47a2974a3f52083155a4'
};
```

These IDs come from `wrangler.toml`.

## Troubleshooting

### Common Issues

1. **"Migration not found" error**
   - Check that the migration file exists in `transformations/`
   - Verify the import path pattern in `migrate.ts` matches your filename

2. **"Invalid data format" error**
   - The KV data might not be in expected format
   - Check a specific key with: `npx wrangler kv key get KEY --namespace-id ID`

3. **Slow performance**
   - Adjust concurrency: `--concurrency 10`
   - Run during off-peak hours

### Debugging

```bash
# Verbose mode for detailed logging
npm run migrate -- -t 001 -n preview --verbose --dry-run

# Check specific key's data
npx wrangler kv key get "user:123:stats:2025-09-28" --namespace-id 3278f9e99cc845e9ad224c6fb2366ecb
```

## Best Practices

1. **Always dry-run first** on preview, then production
2. **Test on single key** before running on all data
3. **Keep migrations small** and focused on one change
4. **Document migrations** clearly in the description
5. **Add validation** for critical transformations
6. **Monitor errors** - use `--stop-on-error` for critical migrations
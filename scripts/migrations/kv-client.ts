/**
 * KV Client Wrapper
 *
 * Wraps wrangler KV commands for programmatic access to Cloudflare KV storage.
 */

import { execSync } from 'child_process';
import type { NamespaceConfig } from './types';

// Namespace IDs from wrangler.toml
const NAMESPACES: NamespaceConfig = {
  preview: '3278f9e99cc845e9ad224c6fb2366ecb',
  production: '04dedd993bbf47a2974a3f52083155a4'
};

export class KVClient {
  private namespaceId: string;
  private verbose: boolean;

  constructor(namespace: 'preview' | 'production', verbose = false) {
    this.namespaceId = NAMESPACES[namespace];
    this.verbose = verbose;
  }

  /**
   * List all keys with optional prefix filter
   */
  async listKeys(prefix?: string): Promise<string[]> {
    try {
      const command = [
        'npx', 'wrangler', 'kv', 'key', 'list',
        '--namespace-id', this.namespaceId,
        prefix ? `--prefix "${prefix}"` : ''
      ].filter(Boolean).join(' ');

      if (this.verbose) {
        console.log(`Executing: ${command}`);
      }

      const output = execSync(command, { encoding: 'utf8' });
      const keys = JSON.parse(output);
      return keys.map((k: { name: string }) => k.name);
    } catch (error) {
      console.error('Failed to list keys:', error);
      throw error;
    }
  }

  /**
   * Get value for a specific key
   */
  async getKey(key: string): Promise<unknown> {
    try {
      const command = [
        'npx', 'wrangler', 'kv', 'key', 'get',
        `"${key}"`,
        '--namespace-id', this.namespaceId
      ].join(' ');

      if (this.verbose) {
        console.log(`Fetching key: ${key}`);
      }

      const output = execSync(command, { encoding: 'utf8' });
      return JSON.parse(output);
    } catch (error) {
      console.error(`Failed to get key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set value for a specific key
   */
  async putKey(key: string, value: unknown): Promise<void> {
    try {
      // Write value to temp file to avoid command line length limits
      const tempFile = `/tmp/kv-value-${Date.now()}.json`;
      const fs = await import('fs');
      fs.writeFileSync(tempFile, JSON.stringify(value));

      const command = [
        'npx', 'wrangler', 'kv', 'key', 'put',
        `"${key}"`,
        '--namespace-id', this.namespaceId,
        '--path', tempFile
      ].join(' ');

      if (this.verbose) {
        console.log(`Updating key: ${key}`);
      }

      execSync(command, { encoding: 'utf8' });

      // Clean up temp file
      fs.unlinkSync(tempFile);
    } catch (error) {
      console.error(`Failed to put key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all stats-related keys
   */
  async getAllStatsKeys(): Promise<string[]> {
    return this.listKeys('user:');
  }

  /**
   * Batch get multiple keys
   */
  async batchGet(keys: string[], concurrency = 5): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < keys.length; i += concurrency) {
      const batch = keys.slice(i, i + concurrency);
      const promises = batch.map(async key => {
        try {
          const value = await this.getKey(key);
          results.set(key, value);
        } catch (error) {
          console.error(`Failed to get ${key}:`, error);
          throw error;
        }
      });

      await Promise.all(promises);

      if (this.verbose) {
        console.log(`Processed ${Math.min(i + concurrency, keys.length)} / ${keys.length} keys`);
      }
    }

    return results;
  }

  /**
   * Batch put multiple key-value pairs
   */
  async batchPut(updates: Map<string, unknown>, concurrency = 5): Promise<void> {
    const entries = Array.from(updates.entries());

    // Process in batches
    for (let i = 0; i < entries.length; i += concurrency) {
      const batch = entries.slice(i, i + concurrency);
      const promises = batch.map(async ([key, value]) => {
        await this.putKey(key, value);
      });

      await Promise.all(promises);

      if (this.verbose) {
        console.log(`Updated ${Math.min(i + concurrency, entries.length)} / ${entries.length} keys`);
      }
    }
  }
}
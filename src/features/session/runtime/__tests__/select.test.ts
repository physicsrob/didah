/**
 * Tests for the select/race utility
 */

import { describe, it, expect } from 'vitest';
import { select, timeout } from '../select';

describe('select', () => {
  it('returns the winner of the race', async () => {
    const result = await select([
      timeout(100, 'slow'),
      timeout(50, 'fast'),
      timeout(150, 'slowest')
    ]);

    expect(result.value).toBe('fast');
    expect(result.winner).toBe(1);
  });

  it('cancels losers when winner resolves', async () => {
    let arm1Cancelled = false;
    let arm3Cancelled = false;

    const result = await select([
      {
        run: (signal) => new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => resolve('arm1'), 100);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            arm1Cancelled = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
      },
      timeout(50, 'arm2'),
      {
        run: (signal) => new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => resolve('arm3'), 150);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            arm3Cancelled = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
      }
    ]);

    expect(result.value).toBe('arm2');
    expect(result.winner).toBe(1);

    // Give time for cancellation to propagate
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(arm1Cancelled).toBe(true);
    expect(arm3Cancelled).toBe(true);
  });

  it('propagates parent signal abort', async () => {
    const parentController = new AbortController();

    const promise = select([
      timeout(1000, 'never'),
      timeout(2000, 'never2')
    ], parentController.signal);

    // Abort immediately
    parentController.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });

  it('handles immediate resolution', async () => {
    const result = await select([
      { run: () => Promise.resolve('immediate') },
      timeout(100, 'slow')
    ]);

    expect(result.value).toBe('immediate');
    expect(result.winner).toBe(0);
  });

  it('propagates non-abort errors', async () => {
    const promise = select([
      {
        run: () => Promise.reject(new Error('Custom error'))
      },
      timeout(100, 'never')
    ]);

    await expect(promise).rejects.toThrow('Custom error');
  });

  it('throws if no arms provided', async () => {
    await expect(select([])).rejects.toThrow('at least one arm');
  });
});
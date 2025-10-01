/**
 * Tests for the select/race utility
 */

import { describe, it, expect } from 'vitest';
import { select, clockTimeout } from '../select';
import { FakeClock } from '../clock';
import { advanceAndFlush } from './testUtils';

describe('select', () => {
  it('returns the winner of the race', async () => {
    const clock = new FakeClock();

    const selectPromise = select([
      clockTimeout(clock, 100, 'slow'),
      clockTimeout(clock, 50, 'fast'),
      clockTimeout(clock, 150, 'slowest')
    ]);

    await advanceAndFlush(clock,50);
    const result = await selectPromise;

    expect(result.value).toBe('fast');
    expect(result.winner).toBe(1);
  });

  it('cancels losers when winner resolves', async () => {
    const clock = new FakeClock();
    let arm1Cancelled = false;
    let arm3Cancelled = false;

    const selectPromise = select([
      {
        run: (signal) => new Promise<string>((resolve, reject) => {
          const timer = clock.setTimeout(() => resolve('arm1'), 100);
          signal.addEventListener('abort', () => {
            clock.clearTimeout(timer);
            arm1Cancelled = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
      },
      clockTimeout(clock, 50, 'arm2'),
      {
        run: (signal) => new Promise<string>((resolve, reject) => {
          const timer = clock.setTimeout(() => resolve('arm3'), 150);
          signal.addEventListener('abort', () => {
            clock.clearTimeout(timer);
            arm3Cancelled = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
      }
    ]);

    await advanceAndFlush(clock,50);
    const result = await selectPromise;

    expect(result.value).toBe('arm2');
    expect(result.winner).toBe(1);

    // Give time for cancellation to propagate
    await advanceAndFlush(clock,1);

    expect(arm1Cancelled).toBe(true);
    expect(arm3Cancelled).toBe(true);
  });

  it('propagates parent signal abort', async () => {
    const clock = new FakeClock();
    const parentController = new AbortController();

    const promise = select([
      clockTimeout(clock, 1000, 'never'),
      clockTimeout(clock, 2000, 'never2')
    ], parentController.signal);

    // Abort immediately
    parentController.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });

  it('handles immediate resolution', async () => {
    const clock = new FakeClock();

    const result = await select([
      { run: () => Promise.resolve('immediate') },
      clockTimeout(clock, 100, 'slow')
    ]);

    expect(result.value).toBe('immediate');
    expect(result.winner).toBe(0);
  });

  it('propagates non-abort errors', async () => {
    const clock = new FakeClock();

    const promise = select([
      {
        run: () => Promise.reject(new Error('Custom error'))
      },
      clockTimeout(clock, 100, 'never')
    ]);

    await expect(promise).rejects.toThrow('Custom error');
  });

  it('throws if no arms provided', async () => {
    await expect(select([])).rejects.toThrow('at least one arm');
  });
});
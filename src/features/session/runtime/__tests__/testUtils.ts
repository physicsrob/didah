/**
 * Test utilities for clock coordination and async testing
 */

import type { FakeClock } from '../clock';

/**
 * Force all pending promises to resolve
 * Uses setImmediate to ensure microtasks are flushed
 */
export async function flushPromises(): Promise<void> {
  await new Promise(resolve => setImmediate(resolve));
}

/**
 * Advance the clock and flush all pending promises
 * This ensures that any promises scheduled by the clock advance are resolved
 */
export async function advanceAndFlush(clock: FakeClock, ms: number): Promise<void> {
  clock.advance(ms);
  await flushPromises();
}

/**
 * Wait for a condition to become true with a timeout
 * Useful for waiting for async state changes
 *
 * @param condition Function that returns true when condition is met
 * @param timeout Maximum time to wait in milliseconds
 * @param checkInterval How often to check the condition
 * @throws Error if condition is not met within timeout
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 1000,
  checkInterval: number = 10
): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error(`waitFor timeout: Condition not met within ${timeout}ms`);
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
}

/**
 * Wait for an async condition to become true
 * Similar to waitFor but supports async condition functions
 */
export async function waitForAsync(
  condition: () => Promise<boolean>,
  timeout: number = 1000,
  checkInterval: number = 10
): Promise<void> {
  const start = Date.now();

  while (!(await condition())) {
    if (Date.now() - start > timeout) {
      throw new Error(`waitForAsync timeout: Condition not met within ${timeout}ms`);
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
}

/**
 * Create a deferred promise that can be resolved/rejected externally
 * Useful for controlling async flow in tests
 */
export function createDeferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Run an async function with a timeout
 * Useful for ensuring tests don't hang indefinitely
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Advance clock in steps, flushing promises between each step
 * Useful for testing time-dependent sequences
 */
export async function advanceInSteps(
  clock: FakeClock,
  steps: number[],
  delayBetweenSteps: number = 0
): Promise<void> {
  for (const step of steps) {
    clock.advance(step);
    await flushPromises();

    if (delayBetweenSteps > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenSteps));
    }
  }
}

/**
 * Create a test config with common defaults
 * Reduces boilerplate in tests
 */
export function createTestConfig(overrides?: Partial<{
  mode: 'active' | 'passive';
  wpm: number;
  speedTier: 'slow' | 'medium' | 'fast' | 'lightning';
  lengthMs: number;
  replay?: boolean;
}>) {
  return {
    mode: 'active' as const,
    wpm: 20,
    speedTier: 'medium' as const,
    lengthMs: 60000,
    ...overrides
  };
}
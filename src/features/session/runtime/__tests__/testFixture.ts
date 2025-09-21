/**
 * Test fixture for reducing boilerplate in session tests
 */

import { FakeClock } from '../clock';
import { TestInputBus } from '../inputBus';
import { TestIO } from './testIO';
import { advanceAndFlush, createTestConfig } from './testUtils';
import { TestTiming } from './timingTestHelpers';

/**
 * Standard test fixture with common dependencies
 */
export class TestFixture {
  clock: FakeClock;
  io: TestIO;
  input: TestInputBus;
  signal: AbortSignal;
  controller: AbortController;

  constructor() {
    this.clock = new FakeClock();
    this.io = new TestIO(this.clock);
    this.input = new TestInputBus();
    this.controller = new AbortController();
    this.signal = this.controller.signal;
  }

  /**
   * Reset all test dependencies to initial state
   */
  reset() {
    this.clock = new FakeClock();
    this.io = new TestIO(this.clock);
    this.input = new TestInputBus();
    this.controller = new AbortController();
    this.signal = this.controller.signal;
  }

  /**
   * Advance clock and flush promises
   */
  async advance(ms: number) {
    await advanceAndFlush(this.clock, ms);
  }

  /**
   * Advance by inter-character spacing
   */
  async advanceInterChar() {
    await this.advance(TestTiming.interChar);
  }

  /**
   * Type a character and optionally advance time
   */
  typeChar(char: string, advanceMs?: number) {
    this.input.type(char, this.clock.now());
    if (advanceMs !== undefined) {
      return this.advance(advanceMs);
    }
  }

  /**
   * Abort the current operation
   */
  abort() {
    this.controller.abort();
  }

  /**
   * Get current time
   */
  now() {
    return this.clock.now();
  }

  /**
   * Create a config with defaults
   */
  createConfig(overrides?: Parameters<typeof createTestConfig>[0]) {
    return createTestConfig(overrides);
  }

  /**
   * Assert timing is within tolerance (useful for floating point comparisons)
   */
  assertTiming(actual: number, expected: number, tolerance: number = 1) {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      throw new Error(`Timing assertion failed: expected ${expected}ms ±${tolerance}ms, got ${actual}ms`);
    }
  }

  /**
   * Run a timing sequence and verify checkpoints
   */
  async runTimingSequence(steps: Array<{ advance: number; verify?: () => void }>) {
    for (const step of steps) {
      await this.advance(step.advance);
      if (step.verify) {
        step.verify();
      }
    }
  }

  /**
   * Get a summary of what happened (for debugging)
   */
  getSummary() {
    return this.io.getSummary();
  }
}

/**
 * Factory function for creating a test fixture
 */
export function createFixture(): TestFixture {
  return new TestFixture();
}
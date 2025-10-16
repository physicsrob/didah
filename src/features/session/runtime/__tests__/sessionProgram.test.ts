/**
 * Tests for the SessionRunner conductor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionRunner, type CharacterSource } from '../sessionProgram';
import { FakeClock } from '../clock';
import { TestInputBus } from '../inputBus';
import { TestIO } from './testIO';
import type { SessionSnapshot } from '../io';
import { advanceAndFlush, createTestConfig, flushPromises } from './testUtils';
import { TestTiming } from './timingTestHelpers';
import { calculateCharacterDurationMs } from '../../../../core/morse/timing';

/**
 * Simple test character source for predictable tests
 */
class TestCharSource implements CharacterSource {
  private readonly chars: string[];

  constructor(alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    this.chars = alphabet.split('');
  }

  next(): string {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }

  peek(): string | null {
    // For test purposes, just return a random character (or null for simplicity)
    return this.chars[Math.floor(Math.random() * this.chars.length)] || null;
  }

  reset(): void {
    // No state to reset for random source
  }
}

describe('SessionRunner', () => {
  let clock: FakeClock;
  let io: TestIO;
  let input: TestInputBus;
  let source: TestCharSource;
  let runner: ReturnType<typeof createSessionRunner>;

  beforeEach(() => {
    clock = new FakeClock();
    io = new TestIO(clock);
    input = new TestInputBus();
    source = new TestCharSource('ABC'); // Simple alphabet for predictable tests
    runner = createSessionRunner({ clock, io, input, source });
  });

  it('starts in idle state', () => {
    const snapshot = runner.getSnapshot();
    expect(snapshot.phase).toBe('idle');
    expect(snapshot.practiceState).toBeUndefined();
    expect(snapshot.liveCopyState).toBeUndefined();
  });

  it('transitions to running when started', async () => {
    const config = createTestConfig({
      lengthMs: 5000
    });

    const snapshots: SessionSnapshot[] = [];
    const unsub = runner.subscribe(s => snapshots.push({ ...s }));

    runner.start(config);

    // Wait a tick for async start
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(snapshots.length).toBeGreaterThan(1);
    expect(snapshots[snapshots.length - 1].phase).toBe('running');

    runner.stop();
    unsub();
  });

  it('logs session start and end', async () => {
    const config = createTestConfig({
      speedTier: 'fast',
      lengthMs: 1000
    });

    runner.start(config);

    // Let session start
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check start log
    expect(io.hasLoggedEvent('sessionStart')).toBe(true);

    // Advance clock to allow any ongoing audio to complete
    await advanceAndFlush(clock, 5000);

    // Stop session and wait for it to complete
    await runner.stop();

    // Check end log
    expect(io.hasLoggedEvent('sessionEnd')).toBe(true);
  });

  it('handles active mode with correct input', async () => {
    // Mock source to return predictable characters
    let charIndex = 0;
    const chars = ['A', 'B', 'C'];
    source.next = () => chars[charIndex++ % chars.length];

    const config = createTestConfig({
      lengthMs: 10000
    });

    const snapshots: SessionSnapshot[] = [];
    runner.subscribe(s => snapshots.push({ ...s }));

    runner.start(config);

    // Wait for first character to start
    await new Promise(resolve => setTimeout(resolve, 10));

    // Advance through audio playback for 'A'
    const audioDuration = calculateCharacterDurationMs('A', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Type correct character after audio completes
    input.type('A', clock.now());

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that character moved to previous (Practice mode)
    const latestSnapshot = snapshots[snapshots.length - 1];
    expect(latestSnapshot.practiceState?.previous.some(item => item.char === 'A')).toBe(true);
    expect(latestSnapshot.practiceState?.stats.correct).toBe(1);

    runner.stop();
  });

  it('handles passive mode timing', async () => {
    // Mock source
    let charIndex = 0;
    const chars = ['X'];
    source.next = () => chars[charIndex++ % chars.length];
    source.peek = () => null; // No next character

    const config = createTestConfig({
      mode: 'listen',
      speedTier: 'slow',
      lengthMs: 100 // Short session to avoid timeout
    });

    // Track snapshots
    const snapshots: SessionSnapshot[] = [];
    runner.subscribe(s => snapshots.push({ ...s }));

    runner.start(config);

    // Let session start and emission begin
    await new Promise(resolve => setTimeout(resolve, 10));

    // Advance clock significantly to let the emission complete
    await advanceAndFlush(clock, 5000);

    // Check that character was added to emissions
    const latestSnapshot = snapshots[snapshots.length - 1];
    expect(latestSnapshot.emissions.some(e => e.char === 'X')).toBe(true);

    // Stop and wait for cleanup
    await runner.stop();
  }, 10000);

  it('can be stopped mid-session', async () => {
    const config = createTestConfig({
      lengthMs: 60000
    });

    // Track phase changes
    const phases: string[] = [];
    const unsubscribe = runner.subscribe(s => phases.push(s.phase));

    runner.start(config);

    // Let it run a bit
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify it's running
    expect(phases).toContain('running');

    // Advance clock to allow any ongoing audio to complete
    await advanceAndFlush(clock, 5000);

    // Stop it and wait for completion
    await runner.stop();

    // The phase should have transitioned to ended
    expect(phases).toContain('ended');
    expect(phases[phases.length - 1]).toBe('ended');

    unsubscribe();
  });

  it('tracks statistics in active mode', async () => {
    // Mock source to return predictable characters
    let charIndex = 0;
    const chars = ['A', 'B', 'C'];
    source.next = () => chars[charIndex++];

    const config = createTestConfig({
      speedTier: 'medium',
      lengthMs: 10000
    });

    runner.start(config);

    // Wait for first character to start
    await flushPromises();

    // Advance through audio playback for 'A'
    const audioDurationA = calculateCharacterDurationMs('A', config.wpm, 0);
    await advanceAndFlush(clock, audioDurationA);

    // Type correct character 'A' after audio completes
    input.type('A', clock.now());
    await flushPromises();

    // Advance for inter-character spacing to complete first emission
    await advanceAndFlush(clock, TestTiming.interChar);

    // Check first character was processed correctly
    let snapshot = runner.getSnapshot();
    expect(snapshot.practiceState?.stats.correct).toBe(1);
    expect(snapshot.practiceState?.previous.some(item => item.char === 'A' && item.result === 'correct')).toBe(true);

    // Now let's trigger a timeout for 'B'
    // Advance through audio for 'B'
    const audioDurationB = calculateCharacterDurationMs('B', config.wpm, 0);
    await advanceAndFlush(clock, audioDurationB);

    // Then advance through recognition window to trigger timeout
    const windowMs = TestTiming.windows.medium;
    await advanceAndFlush(clock, windowMs + 1);

    // Advance for inter-character spacing
    await advanceAndFlush(clock, TestTiming.interChar);

    snapshot = runner.getSnapshot();
    expect(snapshot.practiceState?.stats.correct).toBe(1);
    expect(snapshot.practiceState?.stats.timeout).toBe(1);
    expect(snapshot.practiceState?.previous.some(item => item.char === 'B' && item.result === 'timeout')).toBe(true);

    // The accuracy should be 50% (1 correct out of 2)
    const accuracy = snapshot.practiceState?.stats.accuracy || 0;
    expect(accuracy).toBeCloseTo(50, 0);

    // Advance clock to allow any ongoing operations to complete
    await advanceAndFlush(clock, 5000);

    // Stop the runner and wait for cleanup
    await runner.stop();
  });

  it('allows multiple subscribers', async () => {
    let count1 = 0;
    let count2 = 0;

    const unsub1 = runner.subscribe(() => count1++);
    const unsub2 = runner.subscribe(() => count2++);

    runner.start(createTestConfig({
      lengthMs: 1000
    }));

    expect(count1).toBeGreaterThan(0);
    expect(count2).toBeGreaterThan(0);
    expect(count1).toBe(count2);

    unsub1();
    unsub2();
    await runner.stop();
  });
});
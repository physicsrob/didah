/**
 * Tests for the SessionRunner conductor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionRunner, RandomCharSource } from '../sessionProgram';
import { FakeClock } from '../clock';
import { TestInputBus } from '../inputBus';
import { TestIO } from './testIO';
import type { SessionSnapshot } from '../io';
import { advanceAndFlush, createTestConfig, flushPromises } from './testUtils';
import { TestTiming, getCharTimeout, getListenSequence } from './timingTestHelpers';

describe('SessionRunner', () => {
  let clock: FakeClock;
  let io: TestIO;
  let input: TestInputBus;
  let source: RandomCharSource;
  let runner: ReturnType<typeof createSessionRunner>;

  beforeEach(() => {
    clock = new FakeClock();
    io = new TestIO(clock);
    input = new TestInputBus();
    source = new RandomCharSource('ABC'); // Simple alphabet for predictable tests
    runner = createSessionRunner({ clock, io, input, source });
  });

  it('starts in idle state', () => {
    const snapshot = runner.getSnapshot();
    expect(snapshot.phase).toBe('idle');
    expect(snapshot.currentChar).toBeNull();
    expect(snapshot.previous).toEqual([]);
  });

  it('transitions to running when started', async () => {
    const config = {
      mode: 'practice' as const,
      wpm: 20,
      effectiveWpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 5000
    };

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
    const config = {
      mode: 'practice' as const,
      wpm: 20,
      effectiveWpm: 20,
      speedTier: 'fast' as const,
      lengthMs: 1000
    };

    runner.start(config);

    // Let session start
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check start log
    expect(io.hasLoggedEvent('sessionStart')).toBe(true);

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

    const config = {
      mode: 'practice' as const,
      wpm: 20,
      effectiveWpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 10000
    };

    const snapshots: SessionSnapshot[] = [];
    runner.subscribe(s => snapshots.push({ ...s }));

    runner.start(config);

    // Wait for first character
    await new Promise(resolve => setTimeout(resolve, 10));

    // Type correct character
    input.type('A', clock.now());

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that character moved to previous
    const latestSnapshot = snapshots[snapshots.length - 1];
    expect(latestSnapshot.previous.some(item => item.char === 'A')).toBe(true);
    expect(latestSnapshot.stats?.correct).toBe(1);

    runner.stop();
  });

  it('handles passive mode timing', async () => {
    // Mock source
    let charIndex = 0;
    const chars = ['X'];
    source.next = () => chars[charIndex++ % chars.length];

    const config = createTestConfig({
      mode: 'listen',
      speedTier: 'slow',
      lengthMs: 2000
    });

    // Track reveals
    const reveals: string[] = [];
    const originalReveal = io.reveal.bind(io);
    io.reveal = (char: string) => {
      reveals.push(char);
      originalReveal(char);
    };

    runner.start(config);

    // Let session start
    await flushPromises();

    // Calculate timings for character 'X' using the new Listen mode helper
    const sequence = getListenSequence('X', config.wpm);

    // Advance through audio playback
    await advanceAndFlush(clock, sequence.playChar);

    // Advance through pre-reveal delay
    await advanceAndFlush(clock, sequence.preReveal);

    // Check that reveal was called
    expect(reveals).toContain('X');

    // Also check using TestIO's semantic methods
    expect(io.getReveals()).toContain('X');

    await runner.stop();
  });

  it('can be stopped mid-session', async () => {
    const config = {
      mode: 'practice' as const,
      wpm: 20,
      effectiveWpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 60000
    };

    // Track phase changes
    const phases: string[] = [];
    const unsubscribe = runner.subscribe(s => phases.push(s.phase));

    runner.start(config);

    // Let it run a bit
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify it's running
    expect(phases).toContain('running');

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

    // Type correct character 'A'
    input.type('A', clock.now());
    await flushPromises();

    // Advance for inter-character spacing to complete first emission
    await advanceAndFlush(clock, TestTiming.interChar);

    // Check first character was processed correctly
    let snapshot = runner.getSnapshot();
    expect(snapshot.stats?.correct).toBe(1);
    expect(snapshot.previous.some(item => item.char === 'A' && item.result === 'correct')).toBe(true);

    // Now let's trigger a timeout for 'B'
    // Calculate timings for 'B' with timing helper
    const timeoutTime = getCharTimeout('B', 'medium', config.wpm);

    // Advance to trigger timeout
    await advanceAndFlush(clock, timeoutTime + 1);

    // Advance for inter-character spacing
    await advanceAndFlush(clock, TestTiming.interChar);

    snapshot = runner.getSnapshot();
    expect(snapshot.stats?.correct).toBe(1);
    expect(snapshot.stats?.timeout).toBe(1);
    expect(snapshot.previous.some(item => item.char === 'B' && item.result === 'timeout')).toBe(true);

    // The accuracy should be 50% (1 correct out of 2)
    const accuracy = snapshot.stats?.accuracy || 0;
    expect(accuracy).toBeCloseTo(50, 0);

    // Stop the runner and wait for cleanup
    await runner.stop();
  });

  it('allows multiple subscribers', async () => {
    let count1 = 0;
    let count2 = 0;

    const unsub1 = runner.subscribe(() => count1++);
    const unsub2 = runner.subscribe(() => count2++);

    runner.start({
      mode: 'practice' as const,
      wpm: 20,
      effectiveWpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 1000
    });

    expect(count1).toBeGreaterThan(0);
    expect(count2).toBeGreaterThan(0);
    expect(count1).toBe(count2);

    unsub1();
    unsub2();
    await runner.stop();
  });
});
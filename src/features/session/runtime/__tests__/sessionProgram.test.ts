/**
 * Tests for the SessionRunner conductor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionRunner, RandomCharSource } from '../sessionProgram';
import { FakeClock } from '../clock';
import { TestInputBus } from '../inputBus';
import { MockIO } from '../io';

describe('SessionRunner', () => {
  let clock: FakeClock;
  let io: MockIO;
  let input: TestInputBus;
  let source: RandomCharSource;
  let runner: ReturnType<typeof createSessionRunner>;

  beforeEach(() => {
    clock = new FakeClock();
    io = new MockIO(clock);
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
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 5000
    };

    let snapshots: any[] = [];
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
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'fast' as const,
      lengthMs: 1000
    };

    runner.start(config);

    // Let session start
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check start log
    const startLogs = io.getCalls('log');
    const startLog = startLogs.find(l => l.args[0].type === 'sessionStart');
    expect(startLog).toBeDefined();

    // Stop session and wait for it to complete
    await runner.stop();

    const allLogs = io.getCalls('log');
    const endLog = allLogs.find(l => l.args[0].type === 'sessionEnd');

    expect(endLog).toBeDefined();
  });

  it('stops when time budget is exhausted', async () => {
    const config = {
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'lightning' as const,
      lengthMs: 500 // Short session
    };

    let finalSnapshot: any;
    runner.subscribe(s => finalSnapshot = s);

    runner.start(config);

    // Let it start
    await new Promise(resolve => setTimeout(resolve, 0));

    // Advance time past budget
    clock.advance(600);

    // Let async operations complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(finalSnapshot.phase).toBe('ended');
    expect(finalSnapshot.remainingMs).toBe(0);
  });

  it('handles active mode with correct input', async () => {
    // Mock source to return predictable characters
    let charIndex = 0;
    const chars = ['A', 'B', 'C'];
    source.next = () => chars[charIndex++ % chars.length];

    const config = {
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 10000
    };

    let snapshots: any[] = [];
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
    expect(latestSnapshot.previous).toContain('A');
    expect(latestSnapshot.stats?.correct).toBe(1);

    runner.stop();
  });

  it('handles passive mode timing', async () => {
    // Mock source
    let charIndex = 0;
    const chars = ['X'];
    source.next = () => chars[charIndex++ % chars.length];

    const config = {
      mode: 'passive' as const,
      wpm: 20,
      speedTier: 'slow' as const,
      lengthMs: 2000
    };

    // Track reveals
    const reveals: string[] = [];
    const originalReveal = io.reveal.bind(io);
    io.reveal = (char: string) => {
      reveals.push(char);
      originalReveal(char);
    };

    runner.start(config);

    // Let session start and begin first emission
    await new Promise(resolve => setTimeout(resolve, 50));

    // Advance clock for audio playback (100ms)
    clock.advance(100);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Now advance through pre-reveal delay (3 × 60 = 180ms)
    clock.advance(180);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check that reveal was called
    expect(reveals).toContain('X');

    // Also check using getCalls
    const revealCalls = io.getCalls('reveal');
    expect(revealCalls.length).toBeGreaterThan(0);
    expect(revealCalls[0].args).toEqual(['X']);

    await runner.stop();
  });

  it('can be stopped mid-session', async () => {
    const config = {
      mode: 'active' as const,
      wpm: 20,
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

    const config = {
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 10000
    };

    runner.start(config);

    // Wait for first character to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Type correct character 'A'
    input.type('A', clock.now());

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 150));

    // Check first character was processed correctly
    let snapshot = runner.getSnapshot();
    expect(snapshot.stats?.correct).toBe(1);
    expect(snapshot.previous).toContain('A');

    // Wait for second character 'B' to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Don't type anything for 'B', advance clock to trigger timeout
    // Medium speed = 3 × 60ms = 180ms window
    clock.advance(200);

    // Wait for timeout to process
    await new Promise(resolve => setTimeout(resolve, 50));

    snapshot = runner.getSnapshot();
    expect(snapshot.stats?.correct).toBe(1);
    expect(snapshot.stats?.timeout).toBe(1);
    expect(snapshot.previous).toContain('B');

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
      mode: 'active' as const,
      wpm: 20,
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
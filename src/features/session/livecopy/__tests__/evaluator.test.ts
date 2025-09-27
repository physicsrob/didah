/**
 * Tests for Live Copy evaluator
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateLiveCopy,
  type LiveCopyEvent,
  type LiveCopyConfig,
} from '../evaluator';

describe('evaluateLiveCopy', () => {
  const defaultConfig: LiveCopyConfig = {
    offset: 100,
  };

  it('should handle empty events', () => {
    const result = evaluateLiveCopy([], 0, defaultConfig);
    expect(result.display).toEqual([]);
    expect(result.score).toEqual({
      correct: 0,
      wrong: 0,
      missed: 0,
      total: 0,
      accuracy: 0,
    });
  });

  it('should mark character as pending when window is still open', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
    ];

    // Current time is within window (window opens at 100ms, closes at 600ms: 0+500+100)
    const result = evaluateLiveCopy(events, 150, defaultConfig);

    expect(result.display).toHaveLength(1);
    expect(result.display[0]).toEqual({
      char: 'A',
      status: 'pending',
      typed: undefined,
    });
  });

  it('should mark character as correct when user types correctly', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'typed', char: 'A', time: 150 }, // Within window (100-600)
    ];

    // Current time past window (window closes at 600ms: 0+500+100)
    const result = evaluateLiveCopy(events, 700, defaultConfig);

    expect(result.display[0]).toEqual({
      char: 'A',
      status: 'correct',
      typed: undefined,
    });
    expect(result.score.correct).toBe(1);
    expect(result.score.accuracy).toBe(100);
  });

  it('should mark character as wrong when user types incorrectly', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'typed', char: 'B', time: 150 }, // Wrong char
    ];

    // Current time past window (window closes at 600ms: 0+500+100)
    const result = evaluateLiveCopy(events, 700, defaultConfig);

    expect(result.display[0]).toEqual({
      char: 'A',
      status: 'wrong',
      typed: 'B',
    });
    expect(result.score.wrong).toBe(1);
    expect(result.score.accuracy).toBe(0);
  });

  it('should mark character as missed when user types nothing', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'transmitted', char: 'B', startTime: 500, duration: 500 },
    ];

    // Current time past first window, and past reveal time
    const result = evaluateLiveCopy(events, 700, defaultConfig);

    expect(result.display[0]).toEqual({
      char: 'A',
      status: 'missed',
      typed: undefined,
    });
    expect(result.score.missed).toBe(1);
  });

  it('should use only first character typed in window', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'transmitted', char: 'B', startTime: 500, duration: 500 },
      { type: 'typed', char: 'A', time: 150 }, // First in window
      { type: 'typed', char: 'C', time: 200 }, // Second in window (ignored)
    ];

    const result = evaluateLiveCopy(events, 700, defaultConfig);

    expect(result.display[0].status).toBe('correct');
    expect(result.display[0].typed).toBeUndefined(); // Correct, so no typed shown
  });

  it('should handle case-insensitive matching', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'typed', char: 'a', time: 150 }, // Lowercase
    ];

    const result = evaluateLiveCopy(events, 700, defaultConfig);

    expect(result.display[0].status).toBe('correct');
  });

  it('should calculate windows correctly with multiple characters', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'transmitted', char: 'B', startTime: 500, duration: 500 },
      { type: 'transmitted', char: 'C', startTime: 1000, duration: 500 },
      { type: 'typed', char: 'A', time: 150 }, // In window for A (100-600)
      { type: 'typed', char: 'B', time: 650 }, // In window for B (600-1100)
      { type: 'typed', char: 'C', time: 1150 }, // In window for C (1100-1600)
    ];

    const result = evaluateLiveCopy(events, 1700, defaultConfig);

    expect(result.display[0].status).toBe('correct');
    expect(result.display[1].status).toBe('correct');
    expect(result.display[2].status).toBe('correct');
    expect(result.score.correct).toBe(3);
    expect(result.score.total).toBe(3);
  });

  it('should not reveal during session', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'typed', char: 'B', time: 150 }, // Wrong
    ];

    const result = evaluateLiveCopy(events, 700, defaultConfig);

    expect(result.display[0]).toEqual({
      char: 'A',
      status: 'wrong',
      typed: 'B',
    });
  });

  it('should show typed character immediately even before evaluation', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'typed', char: 'X', time: 120 }, // Typed but window still open
    ];

    // Current time within window
    const result = evaluateLiveCopy(events, 150, defaultConfig);

    expect(result.display[0]).toEqual({
      char: 'A',
      status: 'pending',
      typed: 'X', // Shows what was typed
    });
  });

  it('should handle typed characters outside any window', () => {
    const events: LiveCopyEvent[] = [
      { type: 'typed', char: 'X', time: 50 }, // Before any transmission
      { type: 'transmitted', char: 'A', startTime: 100, duration: 500 },
      { type: 'typed', char: 'A', time: 250 }, // In window
    ];

    const result = evaluateLiveCopy(events, 700, defaultConfig);

    // Only the typed char in the window should count
    expect(result.display[0].status).toBe('correct');
  });

  it('should update current position based on evaluated characters', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'transmitted', char: 'B', startTime: 500, duration: 500 },
      { type: 'transmitted', char: 'C', startTime: 1000, duration: 500 },
      { type: 'typed', char: 'A', time: 150 },
      { type: 'typed', char: 'B', time: 650 },
    ];

    // Current time: 1150 - A evaluated, B evaluated, C still pending
    // A window: 100-600 (closed)
    // B window: 600-1100 (closed)
    // C window: 1100-1600 (open)
    const result = evaluateLiveCopy(events, 1150, defaultConfig);

    // A and B evaluated, C still pending
    expect(result.display[0].status).toBe('correct');
    expect(result.display[1].status).toBe('correct');
    expect(result.display[2].status).toBe('pending');
  });
});
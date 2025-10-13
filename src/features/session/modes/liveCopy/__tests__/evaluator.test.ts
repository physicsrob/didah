/**
 * Tests for Live Copy Evaluator
 */

import { describe, it, expect } from 'vitest';
import { evaluateLiveCopy } from '../evaluator';
import type { LogEvent } from '../../../runtime/io';

/**
 * Helper to create emission events for a string
 */
function createEmissionEvents(transmitted: string, startTime: number = 1000): LogEvent[] {
  return transmitted.split('').map((char, index) => ({
    type: 'emission' as const,
    at: startTime + index * 100,
    char
  }));
}

describe('Live Copy Evaluator', () => {
  it('should handle perfect copy (100% accuracy)', () => {
    const transmitted = 'HELLO';
    const typed = 'HELLO';
    const emissionEvents = createEmissionEvents(transmitted);

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.accuracy).toBe(100);
    expect(result.metrics.correctCount).toBe(5);
    expect(result.metrics.incorrectCount).toBe(0);
    expect(result.metrics.extraCount).toBe(0);

    // All segments should be correct
    expect(result.diffSegments).toHaveLength(5);
    expect(result.diffSegments.every(s => s.type === 'correct')).toBe(true);

    // All events should be correct
    expect(result.events).toHaveLength(5);
    expect(result.events.every(e => e.type === 'correct')).toBe(true);
  });

  it('should detect missed characters', () => {
    const transmitted = 'PARIS';
    const typed = 'PRIS';  // Missing 'A'
    const emissionEvents = createEmissionEvents(transmitted);

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.correctCount).toBe(4); // P, R, I, S
    expect(result.metrics.incorrectCount).toBe(1); // A was missed
    expect(result.metrics.extraCount).toBe(0);
    expect(result.metrics.accuracy).toBe(80); // 4/5 = 80%

    // Diff segments should show what was typed plus the missed character
    // P (correct), A (missed), R (correct), I (correct), S (correct)
    expect(result.diffSegments).toHaveLength(5);
    expect(result.diffSegments[0]).toEqual({ type: 'correct', char: 'P' });
    expect(result.diffSegments[1]).toEqual({ type: 'missed', char: 'A' });
    expect(result.diffSegments[2]).toEqual({ type: 'correct', char: 'R' });
    expect(result.diffSegments[3]).toEqual({ type: 'correct', char: 'I' });
    expect(result.diffSegments[4]).toEqual({ type: 'correct', char: 'S' });

    // Events should include the missed character
    expect(result.events).toHaveLength(5);
    const incorrectEvent = result.events.find(e => e.type === 'incorrect');
    expect(incorrectEvent).toBeDefined();
    if (incorrectEvent && incorrectEvent.type === 'incorrect') {
      expect(incorrectEvent.expected).toBe('A');
    }
  });

  it('should detect extra characters', () => {
    const transmitted = 'SOS';
    const typed = 'SOXS';  // Extra 'X'
    const emissionEvents = createEmissionEvents(transmitted);

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.correctCount).toBe(3); // S, O, S
    expect(result.metrics.incorrectCount).toBe(0);
    expect(result.metrics.extraCount).toBe(1); // X
    expect(result.metrics.accuracy).toBe(100); // All transmitted chars were correct

    // Diff segments should show all typed chars including extra
    expect(result.diffSegments).toHaveLength(4);
    const extraSegment = result.diffSegments.find(s => s.type === 'extra');
    expect(extraSegment).toBeDefined();
    expect(extraSegment?.char).toBe('X');
  });

  it('should detect substitutions (wrong character)', () => {
    const transmitted = 'ABC';
    const typed = 'AXC';  // 'B' replaced with 'X'
    const emissionEvents = createEmissionEvents(transmitted);

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.correctCount).toBe(2); // A, C
    expect(result.metrics.incorrectCount).toBe(1); // B was wrong
    expect(result.metrics.accuracy).toBeCloseTo(66.67, 1); // 2/3 = 66.666...%

    // Diff segments should show: A (correct), X (incorrect with strikethrough), B (missed/correct), C (correct)
    expect(result.diffSegments).toHaveLength(4);
    expect(result.diffSegments[0]).toEqual({ type: 'correct', char: 'A' });
    expect(result.diffSegments[1]).toEqual({ type: 'incorrect', char: 'X', expectedChar: 'B' });
    expect(result.diffSegments[2]).toEqual({ type: 'missed', char: 'B' });
    expect(result.diffSegments[3]).toEqual({ type: 'correct', char: 'C' });

    // Events should include the substitution
    const incorrectEvent = result.events.find(e => e.type === 'incorrect');
    expect(incorrectEvent).toBeDefined();
    if (incorrectEvent && incorrectEvent.type === 'incorrect') {
      expect(incorrectEvent.expected).toBe('B');
      expect(incorrectEvent.got).toBe('X');
    }
  });

  it('should handle mixed errors', () => {
    const transmitted = 'MORSE';
    const typed = 'MXRSEY';  // 'O' → 'X', missing nothing, extra 'Y'
    const emissionEvents = createEmissionEvents(transmitted);

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.correctCount).toBe(4); // M, R, S, E
    expect(result.metrics.incorrectCount).toBe(1); // O was wrong
    expect(result.metrics.extraCount).toBe(1); // Y is extra
    expect(result.metrics.accuracy).toBe(80); // 4/5 = 80%
  });

  it('should handle empty transmitted string', () => {
    const transmitted = '';
    const typed = 'ABC';
    const emissionEvents: LogEvent[] = [];

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.accuracy).toBe(0);
    expect(result.metrics.correctCount).toBe(0);
    expect(result.metrics.incorrectCount).toBe(0);
    expect(result.metrics.extraCount).toBe(3);
  });

  it('should handle empty typed string (all missed)', () => {
    const transmitted = 'ABC';
    const typed = '';
    const emissionEvents = createEmissionEvents(transmitted);

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.accuracy).toBe(0);
    expect(result.metrics.correctCount).toBe(0);
    expect(result.metrics.incorrectCount).toBe(3); // All missed
    expect(result.metrics.extraCount).toBe(0);

    // Diff segments should show all missed characters
    expect(result.diffSegments).toHaveLength(3);
    expect(result.diffSegments[0]).toEqual({ type: 'missed', char: 'A' });
    expect(result.diffSegments[1]).toEqual({ type: 'missed', char: 'B' });
    expect(result.diffSegments[2]).toEqual({ type: 'missed', char: 'C' });

    // All events should be incorrect
    expect(result.events).toHaveLength(3);
    expect(result.events.every(e => e.type === 'incorrect')).toBe(true);
  });

  it('should handle completely wrong copy', () => {
    const transmitted = 'ABC';
    const typed = 'XYZ';
    const emissionEvents = createEmissionEvents(transmitted);

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.accuracy).toBe(0);
    expect(result.metrics.correctCount).toBe(0);
    expect(result.metrics.incorrectCount).toBe(3);

    // Diff segments should show: X (incorrect), A (missed), Y (incorrect), B (missed), Z (incorrect), C (missed)
    expect(result.diffSegments).toHaveLength(6);
    expect(result.diffSegments[0]).toEqual({ type: 'incorrect', char: 'X', expectedChar: 'A' });
    expect(result.diffSegments[1]).toEqual({ type: 'missed', char: 'A' });
    expect(result.diffSegments[2]).toEqual({ type: 'incorrect', char: 'Y', expectedChar: 'B' });
    expect(result.diffSegments[3]).toEqual({ type: 'missed', char: 'B' });
    expect(result.diffSegments[4]).toEqual({ type: 'incorrect', char: 'Z', expectedChar: 'C' });
    expect(result.diffSegments[5]).toEqual({ type: 'missed', char: 'C' });
  });

  it('should use timestamps from emission events', () => {
    const transmitted = 'AB';
    const typed = 'AB';
    const emissionEvents: LogEvent[] = [
      { type: 'emission', at: 5000, char: 'A' },
      { type: 'emission', at: 6000, char: 'B' }
    ];

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    // Check that events have the correct timestamps
    expect(result.events[0].at).toBe(5000);
    expect(result.events[1].at).toBe(6000);
  });

  it('should preserve character case', () => {
    const transmitted = 'HeLLo';
    const typed = 'HeLLo';
    const emissionEvents = createEmissionEvents(transmitted);

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.accuracy).toBe(100);
    expect(result.diffSegments.map(s => s.char).join('')).toBe('HeLLo');
  });

  it('should handle spaces correctly', () => {
    const transmitted = 'HI THERE';
    const typed = 'HI THERE';
    const emissionEvents = createEmissionEvents(transmitted);

    const result = evaluateLiveCopy(transmitted, typed, emissionEvents);

    expect(result.metrics.accuracy).toBe(100);
    expect(result.diffSegments.map(s => s.char).join('')).toBe('HI THERE');
  });
});

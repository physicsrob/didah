/**
 * Timing tests for Live Copy evaluator
 *
 * Tests the display state at fine-grained time intervals to catch
 * flickering, missing characters, and duplicate underscores.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLiveCopy, type LiveCopyEvent, type LiveCopyConfig } from '../evaluator';
import { liveCopyToDisplay } from '../../../../components/CharacterDisplay.transformations';

describe('Live Copy Display Timing', () => {
  const config: LiveCopyConfig = {
    offset: 100,
    feedbackMode: 'immediate',
  };

  it('should display correctly when no input is provided (HELLO sequence)', () => {
    // Simulate regular transmission of HELLO at 500ms intervals
    const transmissions: Array<{ char: string; time: number }> = [
      { char: 'H', time: 0 },
      { char: 'E', time: 500 },
      { char: 'L', time: 1000 },
      { char: 'L', time: 1500 },
      { char: 'O', time: 2000 },
    ];

    const events: LiveCopyEvent[] = transmissions.map(t => ({
      type: 'transmitted' as const,
      char: t.char,
      startTime: t.time,
      duration: 500, // Standard 500ms duration
    }));

    // Test every 20ms from 0 to 2500ms (50 times per second for 2.5 seconds)
    const snapshots: Array<{ time: number; display: string }> = [];

    for (let time = 0; time <= 2600; time += 20) {
      const state = evaluateLiveCopy(events, time, config);
      const displayChars = liveCopyToDisplay(state.display);
      const displayText = displayChars.map(c => c.text).join('');

      snapshots.push({ time, display: displayText });
    }

    // Analyze for issues
    const issues: string[] = [];

    // Check for multiple underscores at same time
    snapshots.forEach(({ time, display }) => {
      const underscoreCount = (display.match(/_/g) || []).length;
      if (underscoreCount > 1) {
        issues.push(`Time ${time}ms: Multiple underscores (${underscoreCount}): "${display}"`);
      }
    });

    // Check for flickering (character appears, disappears, reappears)
    for (let i = 1; i < snapshots.length - 1; i++) {
      const prev = snapshots[i - 1].display;
      const curr = snapshots[i].display;
      const next = snapshots[i + 1].display;

      // Check each position for flickering
      for (let pos = 0; pos < Math.max(prev.length, curr.length, next.length); pos++) {
        const prevChar = prev[pos] || '';
        const currChar = curr[pos] || '';
        const nextChar = next[pos] || '';

        // Flickering: character changes and then changes back
        if (prevChar && currChar !== prevChar && nextChar === prevChar) {
          issues.push(`Time ${snapshots[i].time}ms: Flicker at position ${pos}: "${prevChar}" -> "${currChar}" -> "${nextChar}"`);
        }
      }
    }

    // Print timeline for debugging
    console.log('\n=== Live Copy Display Timeline (no input) ===');
    console.log('Expected behavior:');
    console.log('  0-99ms: Nothing displayed');
    console.log('  100-599ms: "_" (H pending)');
    console.log('  600-1099ms: "H_" (H missed, E pending)');
    console.log('  1100-1599ms: "HE_" (E missed, first L pending)');
    console.log('  1600-2099ms: "HEL_" (first L missed, second L pending)');
    console.log('  2100-2599ms: "HELL_" (second L missed, O pending)');
    console.log('  2600+ms: "HELLO" (O missed)');
    console.log('\nActual timeline:');

    // Print key moments
    const keyMoments = [0, 80, 100, 120, 580, 600, 620, 1080, 1100, 1120, 1580, 1600, 1620, 2080, 2100, 2120, 2580, 2600, 2620];
    keyMoments.forEach(time => {
      const snapshot = snapshots.find(s => s.time === time);
      if (snapshot) {
        console.log(`  ${time}ms: "${snapshot.display}"`);
      }
    });

    // Report issues
    if (issues.length > 0) {
      console.log('\n=== Issues Found ===');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    // Assertions
    expect(issues).toHaveLength(0);

    // Verify specific expected states
    const at100 = snapshots.find(s => s.time === 100);
    expect(at100?.display).toBe('_'); // At 100ms should show single underscore for pending H

    const at600 = snapshots.find(s => s.time === 600);
    expect(at600?.display).toBe('H_'); // At 600ms should show H (missed) and underscore for pending E

    const at1100 = snapshots.find(s => s.time === 1100);
    expect(at1100?.display).toBe('HE_'); // At 1100ms should show HE and underscore for pending L

    const at2600 = snapshots.find(s => s.time === 2600);
    expect(at2600?.display).toBe('HELLO'); // At 2600ms should show complete HELLO
  });

  it('should handle the last character without flickering', () => {
    // Focus on the last character behavior
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'transmitted', char: 'B', startTime: 500, duration: 500 },
    ];

    const snapshots: Array<{ time: number; display: string }> = [];

    // Test from 400ms to 800ms in 10ms increments (around the second character)
    for (let time = 400; time <= 800; time += 10) {
      const state = evaluateLiveCopy(events, time, config);
      const displayChars = liveCopyToDisplay(state.display);
      const displayText = displayChars.map(c => c.text).join('');

      snapshots.push({ time, display: displayText });
    }

    console.log('\n=== Last Character Behavior ===');
    snapshots.forEach(({ time, display }) => {
      console.log(`  ${time}ms: "${display}"`);
    });

    // Check for consistency - no flickering
    let lastDisplay = '';
    const changes: string[] = [];

    snapshots.forEach(({ time, display }) => {
      if (display !== lastDisplay) {
        changes.push(`${time}ms: "${lastDisplay}" -> "${display}"`);
        lastDisplay = display;
      }
    });

    console.log('\nDisplay changes:');
    changes.forEach(change => console.log(`  ${change}`));

    // Should have smooth transitions, no back-and-forth
    expect(changes.length).toBeLessThanOrEqual(3); // Initial, A appears, B appears

    // No going back to previous states
    const displays = snapshots.map(s => s.display);
    for (let i = 1; i < displays.length; i++) {
      if (displays[i] !== displays[i-1]) {
        // Once changed, shouldn't go back
        for (let j = i + 1; j < displays.length; j++) {
          expect(displays[j]).not.toBe(displays[i-1]); // Display shouldn't revert back
        }
      }
    }
  });

  it('should never show duplicate underscores', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'X', startTime: 0, duration: 500 },
      { type: 'transmitted', char: 'Y', startTime: 500, duration: 500 },
      { type: 'transmitted', char: 'Z', startTime: 1000, duration: 500 },
    ];

    // Test entire sequence
    for (let time = 0; time <= 1500; time += 10) {
      const state = evaluateLiveCopy(events, time, config);
      const displayChars = liveCopyToDisplay(state.display);
      const displayText = displayChars.map(c => c.text).join('');

      const underscoreCount = (displayText.match(/_/g) || []).length;

      expect(underscoreCount).toBeLessThanOrEqual(1); // Should only have at most one underscore
    }
  });
});
/**
 * Tests for Live Copy corrections display
 *
 * Ensures that corrections are properly shown when characters are wrong or timeout
 */

import { describe, it, expect } from 'vitest';
import { evaluateLiveCopy, type LiveCopyEvent, type LiveCopyConfig, type TransmitEvent } from '../evaluator';
import { liveCopyToDisplay } from '../../../../components/CharacterDisplay.transformations';

describe('Live Copy Corrections Display', () => {
  const config: LiveCopyConfig = {
    offset: 100,
    feedbackMode: 'immediate',
  };

  it('should show correction when character times out', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'transmitted', char: 'B', startTime: 500, duration: 500 },
      // No typing - both should timeout
    ];

    // Test at various times to see when corrections appear
    const snapshots: Array<{ time: number; display: string; revealed: boolean[] }> = [];

    for (let time = 0; time <= 1100; time += 50) {
      const state = evaluateLiveCopy(events, time, config);
      const displayChars = liveCopyToDisplay(state.display);
      const displayText = displayChars.map(c => c.text).join('');
      const revealed = state.display.map(d => d.revealed);

      snapshots.push({ time, display: displayText, revealed });
    }

    console.log('\n=== Timeout Corrections Timeline ===');
    console.log('Expected: Characters should be revealed after timeout');
    snapshots.forEach(({ time, display, revealed }) => {
      console.log(`  ${time}ms: "${display}" revealed:[${revealed.join(',')}]`);
    });

    // At 600ms, A should be revealed as missed (A window closes)
    const at600 = snapshots.find(s => s.time === 600);
    expect(at600?.display).toBe('A_');
    expect(at600?.revealed[0]).toBe(true); // A should be revealed

    // At 800ms, B window is still open (closes at 1100ms), so B shows "_"
    const at800 = snapshots.find(s => s.time === 800);
    expect(at800?.display).toBe('A_'); // B still pending, not revealed yet
    expect(at800?.revealed[1]).toBe(false); // B should not be revealed yet

    // At 1100ms, B should be revealed as missed (B window closes)
    const at1100 = snapshots.find(s => s.time === 1100);
    expect(at1100?.display).toBe('AB');
    expect(at1100?.revealed[1]).toBe(true); // B should be revealed
  });

  it('should show correction immediately when wrong character typed', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'typed', char: 'B', time: 150 }, // Wrong character
      { type: 'transmitted', char: 'C', startTime: 500, duration: 500 },
    ];

    // Test at various times
    const snapshots: Array<{ time: number; display: string; details: any }> = [];

    for (let time = 100; time <= 700; time += 50) {
      const state = evaluateLiveCopy(events, time, config);
      const displayChars = liveCopyToDisplay(state.display);
      const displayText = displayChars.map(c => c.text).join('');

      snapshots.push({
        time,
        display: displayText,
        details: state.display.map(d => ({
          char: d.char,
          status: d.status,
          typed: d.typed,
          revealed: d.revealed
        }))
      });
    }

    console.log('\n=== Wrong Character Corrections Timeline ===');
    console.log('Expected: Wrong character should be corrected immediately');
    console.log('Setup: A transmitted at 0ms, B typed at 150ms, C transmitted at 500ms');
    console.log('Windows: A (100-600ms), C (600ms+)');
    snapshots.forEach(({ time, display, details }) => {
      console.log(`  ${time}ms: "${display}"`);
      details.forEach((d: any, i: number) => {
        const state = evaluateLiveCopy(events, time, config);
        const transmitted = state.display[i];
        if (transmitted) {
          // Calculate window timing for this character
          const tx = events.find((e): e is TransmitEvent => e.type === 'transmitted' && e.char === transmitted.char);
          if (tx) {
            const windowStart = tx.startTime + config.offset;
            const nextTx = events.find((e): e is TransmitEvent => e.type === 'transmitted' && e.startTime > tx.startTime);
            const windowEnd = nextTx ? nextTx.startTime + config.offset : windowStart + 200;
            console.log(`    [${i}] char:${d.char} status:${d.status} typed:${d.typed} revealed:${d.revealed} window:(${windowStart}-${windowEnd}ms)`);
          } else {
            console.log(`    [${i}] char:${d.char} status:${d.status} typed:${d.typed} revealed:${d.revealed}`);
          }
        }
      });
    });

    // At 200ms (during window) - should show what user typed, not correction yet
    const at200 = snapshots.find(s => s.time === 200);
    console.log('\nAt 200ms, during window - should show typed character:');
    console.log('  Display:', at200?.display);
    console.log('  Details:', at200?.details);

    // Should show the typed character 'B' (during window), not correction 'A' yet
    expect(at200?.display).toContain('B'); // Should show what user typed
    expect(at200?.details[0].revealed).toBe(false); // Not revealed during window

    // At 600ms (after window closes) - should show correction
    const at600 = snapshots.find(s => s.time === 600);
    expect(at600?.display).toContain('A'); // Should show correction after window closes
  });

  it('should handle mixed correct/wrong/timeout characters', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'H', startTime: 0, duration: 500 },
      { type: 'typed', char: 'H', time: 150 }, // Correct

      { type: 'transmitted', char: 'E', startTime: 500, duration: 500 },
      { type: 'typed', char: 'F', time: 650 }, // Wrong

      { type: 'transmitted', char: 'L', startTime: 1000, duration: 500 },
      // No typing for L - timeout

      { type: 'transmitted', char: 'L', startTime: 1500, duration: 500 },
      { type: 'typed', char: 'L', time: 1650 }, // Correct

      { type: 'transmitted', char: 'O', startTime: 2000, duration: 500 },
    ];

    // Check state at 2600ms (after all windows closed)
    // O window: opens at 2100ms (2000+100), closes at 2600ms (2000+500+100)
    const state = evaluateLiveCopy(events, 2600, config);
    const displayChars = liveCopyToDisplay(state.display);
    const displayText = displayChars.map(c => c.text).join('');

    console.log('\n=== Mixed Corrections ===');
    console.log('State at 2600ms:');
    state.display.forEach((d, i) => {
      console.log(`  [${i}] char:${d.char} status:${d.status} typed:${d.typed || 'none'} revealed:${d.revealed}`);
    });
    console.log(`Display: "${displayText}"`);

    // Check each character
    expect(state.display[0].status).toBe('correct'); // H
    expect(state.display[0].revealed).toBe(true);

    expect(state.display[1].status).toBe('wrong'); // E typed as F
    expect(state.display[1].revealed).toBe(true);
    expect(state.display[1].typed).toBe('F');

    expect(state.display[2].status).toBe('missed'); // L timeout
    expect(state.display[2].revealed).toBe(true);

    expect(state.display[3].status).toBe('correct'); // L
    expect(state.display[3].revealed).toBe(true);

    expect(state.display[4].status).toBe('missed'); // O timeout
    expect(state.display[4].revealed).toBe(true);

    // Display should show corrections: HELLO (not HFLLO)
    expect(displayText).toBe('HELLO');
  });

  it('should reveal corrections at the right time', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'typed', char: 'B', time: 150 }, // Wrong
      { type: 'transmitted', char: 'C', startTime: 500, duration: 500 },
    ];

    // Check reveal timing
    const times = [140, 150, 160, 590, 600, 610];

    console.log('\n=== Reveal Timing ===');
    times.forEach(time => {
      const state = evaluateLiveCopy(events, time, config);
      const display = liveCopyToDisplay(state.display);
      console.log(`${time}ms: "${display.map(c => c.text).join('')}" A revealed:${state.display[0]?.revealed}`);
    });

    // Before typing: not revealed
    const at140 = evaluateLiveCopy(events, 140, config);
    expect(at140.display[0]?.revealed).toBe(false);

    // After typing wrong (but window still open): should NOT be revealed yet
    // New UX: only reveal after window closes, not immediately
    const at160 = evaluateLiveCopy(events, 160, config);
    expect(at160.display[0]?.revealed).toBe(false);

    // After window closes: should be revealed
    const at600 = evaluateLiveCopy(events, 600, config);
    expect(at600.display[0]?.revealed).toBe(true);
  });

  it('should not change status from pending to wrong until window actually closes', () => {
    const events: LiveCopyEvent[] = [
      { type: 'transmitted', char: 'A', startTime: 0, duration: 500 },
      { type: 'typed', char: 'B', time: 150 }, // Wrong character typed early
      { type: 'transmitted', char: 'C', startTime: 500, duration: 500 },
    ];

    console.log('\n=== Window Status Bug Debug ===');
    console.log('A transmitted: 0ms, B typed: 150ms, C transmitted: 500ms');
    console.log('Expected A window: 100ms-600ms (0+500+100)');

    // Test key moments
    const testTimes = [150, 200, 300, 400, 500, 590, 600, 610];

    testTimes.forEach(time => {
      const state = evaluateLiveCopy(events, time, config);
      const aChar = state.display[0];

      // Calculate expected window timing
      // const windowStart = 100; // 0 + 100 offset - unused variable
      const windowEnd = 600;   // 0 + 500 duration + 100 offset
      const expectedStatus = time < windowEnd ? 'pending' : (time >= windowEnd ? 'wrong' : 'pending');

      console.log(`${time}ms: status=${aChar?.status} expected=${expectedStatus} windowEnd=${windowEnd} inWindow=${time < windowEnd}`);

      if (time < windowEnd) {
        expect(aChar?.status).toBe('pending'); // Window should still be open
      } else {
        expect(aChar?.status).toBe('wrong'); // Window should be closed and status determined
      }
    });
  });
});
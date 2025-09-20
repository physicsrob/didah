#!/usr/bin/env node

/**
 * CLI utility for simulating Morse code sessions
 * Usage: npm run morse-sim "HELLO WORLD" --mode passive --wpm 20 --speed medium --clock instant
 */

import * as readline from 'readline';
import { parseArgs } from './args';
import { createMockIO } from './mockIO';
import { InstantClock, RealtimeClock } from './clocks';
import { SimpleInputBus } from '../features/session/runtime/inputBus';
import { runActiveEmission, runPassiveEmission } from '../features/session/runtime/charPrograms';
import type { SessionConfig } from '../features/session/runtime/charPrograms';

// Parse command line arguments
const args = parseArgs(process.argv.slice(2));

// Create clock based on mode
const clock = args.clockMode === 'instant'
  ? new InstantClock()
  : new RealtimeClock();

// Create input bus
const inputBus = new SimpleInputBus();

// Create mock IO
const io = createMockIO(clock, args.clockMode);

// Session config
const config: SessionConfig = {
  mode: args.mode,
  wpm: args.wpm,
  speedTier: args.speed,
  lengthMs: 60000, // Not used for CLI simulation
  replay: args.mode === 'active'
};

// Setup keyboard input for real-time active mode
let rl: readline.Interface | null = null;
if (args.clockMode === 'realtime' && args.mode === 'active') {
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', (str: string, key: any) => {
      if (key && key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (str) {
        inputBus.push({
          at: clock.now(),
          key: str.toUpperCase()
        });

        // Visual feedback for keypress in realtime mode
        if (args.clockMode === 'realtime') {
          process.stdout.write(`[${str.toUpperCase()}]`);
        }
      }
    });

    console.log('🎹 Keyboard input enabled. Press Ctrl+C to exit.\n');
  }
}

// Cleanup function
function cleanup() {
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
  if (rl) {
    rl.close();
  }
}

// Handle exit
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

// Main execution
async function run() {
  const text = args.text.toUpperCase();
  const chars = text.split('');

  console.log('═══════════════════════════════════════════');
  console.log(`📡 Morse Code Simulator`);
  console.log(`Mode: ${args.mode} | WPM: ${args.wpm} | Speed: ${args.speed}`);
  console.log(`Clock: ${args.clockMode} | Text: "${text}"`);
  console.log('═══════════════════════════════════════════\n');

  io.log({ type: 'sessionStart', at: clock.now(), config });

  // Create abort controller for session
  const abortController = new AbortController();

  try {
    for (const char of chars) {
      if (char === ' ') {
        // Handle spaces
        if (args.clockMode === 'realtime') {
          console.log('⎵ [SPACE]');
          await clock.sleep(500, abortController.signal); // Word spacing
        } else {
          io.log({ type: 'emission', at: clock.now(), char: ' ' });
          (clock as InstantClock).advance(500);
        }
        continue;
      }

      if (args.mode === 'active') {
        await runActiveEmission(
          config,
          char,
          io,
          inputBus,
          clock,
          abortController.signal
        );
      } else {
        await runPassiveEmission(
          config,
          char,
          io,
          clock,
          abortController.signal
        );
      }

      // Small inter-character delay
      if (args.clockMode === 'realtime') {
        await clock.sleep(100, abortController.signal);
      } else {
        (clock as InstantClock).advance(100);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('\n⚠️ Session aborted');
    } else {
      console.error('\n❌ Error:', error);
    }
  } finally {
    io.log({ type: 'sessionEnd', at: clock.now() });

    console.log('\n═══════════════════════════════════════════');
    console.log('📊 Session Complete');

    if (args.clockMode === 'instant') {
      const instantClock = clock as InstantClock;
      console.log(`Total simulated time: ${instantClock.currentTime}ms`);
    }

    console.log('═══════════════════════════════════════════');

    cleanup();
    process.exit(0);
  }
}

// Run the simulation
run().catch(error => {
  console.error('Fatal error:', error);
  cleanup();
  process.exit(1);
});
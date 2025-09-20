/**
 * Mock IO implementation for CLI simulation
 */

import type { IO, LogEvent } from '../features/session/runtime/io';
import type { Clock } from '../features/session/runtime/clock';
import { MORSE_ALPHABET } from '../core/morse/alphabet';
import { wpmToDitMs } from '../core/morse/timing';

export function createMockIO(clock: Clock, clockMode: 'instant' | 'realtime'): IO {
  const isRealtime = clockMode === 'realtime';

  // Calculate audio duration for a character
  function getAudioDuration(char: string, wpm: number = 20): number {
    const pattern = MORSE_ALPHABET[char.toUpperCase()];
    if (!pattern) return 100; // Default for unknown chars

    let duration = 0;
    const ditMs = wpmToDitMs(wpm);
    const dahMs = ditMs * 3; // Dah is 3x dit length
    const intraSpacing = ditMs; // Spacing between dits/dahs is 1 dit

    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '.') {
        duration += ditMs;
      } else if (pattern[i] === '-') {
        duration += dahMs;
      }
      // Add spacing between elements (except after last)
      if (i < pattern.length - 1) {
        duration += intraSpacing;
      }
    }

    return duration;
  }

  return {
    async playChar(char: string): Promise<void> {
      const duration = getAudioDuration(char);
      const startTime = clock.now();

      if (isRealtime) {
        // Real-time mode: show live feedback
        process.stdout.write(`🔊 Playing '${char}'... `);
        await clock.sleep(duration);
        console.log('✓');
      } else {
        // Instant mode: just log the event
        console.log(`[${startTime}ms] PLAY_CHAR: '${char}' (duration: ${duration}ms)`);
        // Simulate the passage of time in instant mode
        if ('advance' in clock) {
          (clock as any).advance(duration);
        }
        console.log(`[${clock.now()}ms] AUDIO_COMPLETE: '${char}' (played for ${duration}ms)`);
      }
    },

    async stopAudio(): Promise<void> {
      if (isRealtime) {
        // In real-time, this happens instantly
        process.stdout.write(' [stopped]');
      } else {
        console.log(`[${clock.now()}ms] AUDIO_STOP`);
      }
    },

    reveal(char: string): void {
      if (isRealtime) {
        console.log(`📝 Revealed: '${char}'`);
      } else {
        console.log(`[${clock.now()}ms] REVEAL: '${char}'`);
      }
    },

    hide(): void {
      if (isRealtime) {
        // In real-time mode, we don't need to log hide
      } else {
        console.log(`[${clock.now()}ms] HIDE`);
      }
    },

    feedback(kind: 'correct' | 'incorrect' | 'timeout', char: string): void {
      if (isRealtime) {
        switch (kind) {
          case 'correct':
            console.log(`✅ Correct: '${char}'`);
            break;
          case 'incorrect':
            process.stdout.write(' ❌');
            break;
          case 'timeout':
            console.log(`⏱️ Timeout: '${char}'`);
            break;
        }
      } else {
        console.log(`[${clock.now()}ms] FEEDBACK: ${kind} for '${char}'`);
      }
    },

    async replay(char: string): Promise<void> {
      if (isRealtime) {
        console.log(`🔄 Replaying '${char}'...`);
        await clock.sleep(getAudioDuration(char));
      } else {
        const duration = getAudioDuration(char);
        console.log(`[${clock.now()}ms] REPLAY: '${char}' (duration: ${duration}ms)`);
        if ('advance' in clock) {
          (clock as any).advance(duration);
        }
      }
    },

    log(event: LogEvent): void {
      if (isRealtime) {
        // In real-time mode, only log key events
        switch (event.type) {
          case 'sessionStart':
            // Already logged in main
            break;
          case 'sessionEnd':
            // Will be logged in main
            break;
          case 'emission':
            // Don't log, we show play instead
            break;
          case 'correct':
            // Already shown in feedback
            console.log(`   ⏱️ Latency: ${event.latencyMs}ms`);
            break;
          case 'incorrect':
            console.log(`   ❌ Expected '${event.expected}', got '${event.got}'`);
            break;
          case 'timeout':
            // Already shown in feedback
            break;
        }
      } else {
        // In instant mode, log everything with timestamp
        switch (event.type) {
          case 'sessionStart':
            console.log(`[${event.at}ms] SESSION_START: mode=${event.config.mode}, wpm=${event.config.wpm}, speed=${event.config.speedTier}`);
            break;
          case 'sessionEnd':
            console.log(`[${event.at}ms] SESSION_END`);
            break;
          case 'emission':
            console.log(`[${event.at}ms] EMIT_START: char='${event.char}'`);
            break;
          case 'correct':
            console.log(`[${event.at}ms] KEY_CORRECT: '${event.char}' (latency: ${event.latencyMs}ms)`);
            break;
          case 'incorrect':
            console.log(`[${event.at}ms] KEY_INCORRECT: expected='${event.expected}', got='${event.got}'`);
            break;
          case 'timeout':
            console.log(`[${event.at}ms] TIMEOUT: char='${event.char}'`);
            break;
        }
      }
    },

    snapshot(snapshot: any): void {
      // Not used in CLI
    }
  };
}
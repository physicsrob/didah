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
  function getAudioDuration(char: string, sessionWpm: number): number {
    const pattern = MORSE_ALPHABET[char.toUpperCase()];
    if (!pattern) return 100; // Default for unknown chars

    let duration = 0;
    const ditMs = wpmToDitMs(sessionWpm);
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
    async playChar(char: string, wpm: number): Promise<void> {
      const duration = getAudioDuration(char, wpm);
      const startTime = clock.now();

      if (isRealtime) {
        // Real-time mode: show timestamped feedback
        console.log(`[${startTime}ms] PLAY_CHAR: '${char}' (duration: ${duration}ms)`);
        await clock.sleep(duration);
        console.log(`[${clock.now()}ms] AUDIO_COMPLETE: '${char}' (played for ${duration}ms)`);
      } else {
        // Instant mode: use clock.sleep which auto-advances
        console.log(`[${startTime}ms] PLAY_CHAR: '${char}' (duration: ${duration}ms)`);
        // Don't manually advance - clock.sleep handles it
        await clock.sleep(duration);
        console.log(`[${clock.now()}ms] AUDIO_COMPLETE: '${char}' (played for ${duration}ms)`);
      }
    },

    async stopAudio(): Promise<void> {
      console.log(`[${clock.now()}ms] AUDIO_STOP`);
    },

    reveal(char: string): void {
      console.log(`[${clock.now()}ms] REVEAL: '${char}'`);
    },

    hide(): void {
      console.log(`[${clock.now()}ms] HIDE`);
    },

    feedback(kind: 'correct' | 'incorrect' | 'timeout', char: string): void {
      console.log(`[${clock.now()}ms] FEEDBACK: ${kind} for '${char}'`);
    },

    async replay(char: string, wpm: number): Promise<void> {
      const duration = getAudioDuration(char, wpm);
      const startTime = clock.now();

      console.log(`[${startTime}ms] REPLAY: '${char}' (duration: ${duration}ms)`);

      if (isRealtime) {
        await clock.sleep(duration);
        console.log(`[${clock.now()}ms] REPLAY_COMPLETE: '${char}' (played for ${duration}ms)`);
      } else {
        // Use clock.sleep which auto-advances - don't manually advance
        await clock.sleep(duration);
        console.log(`[${clock.now()}ms] REPLAY_COMPLETE: '${char}' (played for ${duration}ms)`);
      }
    },

    log(event: LogEvent): void {
      // Unified timestamped logging for both modes
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
    },

    snapshot(_snapshot: any): void {
      // Not used in CLI
    }
  };
}
/**
 * IO port abstraction for all side effects
 */

import type { Clock } from './clock';
import { calculateCharacterDurationMs } from '../../../core/morse/timing';

export type SessionSnapshot = {
  phase: 'idle' | 'running' | 'ended';
  currentChar: string | null;
  previous: string[];
  startedAt: number | null;
  remainingMs: number;
  stats?: {
    correct: number;
    incorrect: number;
    timeout: number;
    accuracy: number; // percentage
  };
};

export type LogEvent =
  | { type: 'sessionStart'; at: number; config: any }
  | { type: 'sessionEnd'; at: number }
  | { type: 'emission'; at: number; char: string }
  | { type: 'correct'; at: number; char: string; latencyMs: number }
  | { type: 'incorrect'; at: number; expected: string; got: string }
  | { type: 'timeout'; at: number; char: string };

export interface IO {
  /**
   * Play audio for a character, resolves when audio completes
   */
  playChar(char: string, wpm: number): Promise<void>;

  /**
   * Stop currently playing audio
   */
  stopAudio(): Promise<void>;

  /**
   * Reveal character (passive mode)
   */
  reveal(char: string): void;

  /**
   * Hide character (passive mode)
   */
  hide(): void;

  /**
   * Provide feedback for user action
   */
  feedback(kind: 'correct' | 'incorrect' | 'timeout', char: string): void;

  /**
   * Replay character with visual (optional, for active mode with replay enabled)
   */
  replay?(char: string, wpm: number): Promise<void>;

  /**
   * Log session events
   */
  log(event: LogEvent): void;

  /**
   * Push session snapshot updates (optional, for UI)
   */
  snapshot?(snapshot: SessionSnapshot): void;
}

/**
 * No-op IO implementation for testing
 */
export class MockIO implements IO {
  calls: Array<{ method: string; args: any[] }> = [];
  private clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  async playChar(char: string, wpm: number): Promise<void> {
    this.calls.push({ method: 'playChar', args: [char, wpm] });

    // Use actual character duration instead of hardcoded 100ms
    const duration = calculateCharacterDurationMs(char, wpm);
    await this.clock.sleep(duration);
  }

  async stopAudio(): Promise<void> {
    this.calls.push({ method: 'stopAudio', args: [] });
  }

  reveal(char: string): void {
    this.calls.push({ method: 'reveal', args: [char] });
  }

  hide(): void {
    this.calls.push({ method: 'hide', args: [] });
  }

  feedback(kind: 'correct' | 'incorrect' | 'timeout', char: string): void {
    this.calls.push({ method: 'feedback', args: [kind, char] });
  }

  async replay(char: string, wpm: number): Promise<void> {
    this.calls.push({ method: 'replay', args: [char, wpm] });
    // Use actual character duration for replay as well
    const duration = calculateCharacterDurationMs(char, wpm);
    await this.clock.sleep(duration);
  }

  log(event: LogEvent): void {
    this.calls.push({ method: 'log', args: [event] });
  }

  snapshot(snapshot: SessionSnapshot): void {
    this.calls.push({ method: 'snapshot', args: [snapshot] });
  }

  clear(): void {
    this.calls = [];
  }

  getCalls(method?: string): Array<{ method: string; args: any[] }> {
    return method
      ? this.calls.filter(c => c.method === method)
      : this.calls;
  }
}
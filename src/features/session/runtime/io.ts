/**
 * IO port abstraction for all side effects
 */

export interface HistoryItem {
  char: string;
  result: 'correct' | 'incorrect' | 'timeout' | 'listen';
}

export type SessionSnapshot = {
  phase: 'idle' | 'running' | 'ended';
  currentChar: string | null;
  previous: HistoryItem[];
  startedAt: number | null;
  remainingMs: number;
  transmittedChars?: string[]; // For Live Copy mode - tracks what's been sent
  stats?: {
    correct: number;
    incorrect: number;
    timeout: number;
    accuracy: number; // percentage
  };
};

import type { SessionConfig } from './charPrograms';

export type LogEvent =
  | { type: 'sessionStart'; at: number; config: SessionConfig }
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

// MockIO has been replaced by TestIO in __tests__/testIO.ts
// which provides better semantic query methods for testing
/**
 * IO port abstraction for all side effects
 */

/**
 * History item for Practice mode
 * Tracks character and user's response result
 */
export interface HistoryItem {
  char: string;
  result: 'correct' | 'incorrect' | 'timeout';
}

/**
 * Practice mode state
 */
export interface PracticeState {
  previous: HistoryItem[];
  stats: {
    correct: number;
    incorrect: number;
    timeout: number;
    accuracy: number; // percentage
  };
}

/**
 * Live Copy mode state
 */
export interface LiveCopyState {
  // Note: This is not UI state. Fundamentally the typedString is the response from the
  // user. In the very near future we will be using this to evaluate how the user performed.
  typedString: string;
}

/**
 * Word Practice mode state
 */
export interface WordPracticeState {
  currentWord: string | null;  // Word being played/tested
  distractors: string[];        // Distractor words for current trial
  buttonWords: string[];        // Pre-shuffled button order (to prevent re-shuffle on render)
  isPlaying: boolean;           // True while word audio is playing
  flashResult: 'correct' | 'incorrect' | null;  // Visual feedback state
  clickedWord: string | null;   // Word that was clicked (for flash targeting)
  stats: {
    attempts: number;
    successes: number;
    timeouts: number;
    accuracy: number; // percentage
  };
}

/**
 * Session snapshot - observable state of the current session
 *
 * Contains universal state (all modes) and mode-specific state.
 * Mode-specific fields are optional and only present when that mode is active.
 */
export type SessionSnapshot = {
  // Universal state (all modes)
  phase: 'idle' | 'running' | 'paused' | 'ended';
  startedAt: number | null;
  remainingMs: number;
  emissions: Array<{
    char: string;
    startTime: number;
    duration: number; // Total emission duration (character audio + inter-character spacing)
  }>; // Track all emitted characters with timing

  // Mode-specific state
  practiceState?: PracticeState;
  liveCopyState?: LiveCopyState;
  wordPracticeState?: WordPracticeState;
};

import type { SessionConfig } from '../../../core/types/domain';

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

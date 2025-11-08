import type { SessionMode, SpeedTier, ToneSetting } from '../../../functions/shared/types'

// Re-export shared types for convenience
export type { SessionMode, SpeedTier, ToneSetting }

// Session lifecycle
export type SessionConfig = {
  mode: SessionMode;
  lengthMs: number;
  wpm: number;
  farnsworthWpm: number; // For Farnsworth timing (when equal to wpm, standard timing is used)
  speedTier: SpeedTier;
  sourceId: string;
  sourceName: string;  // Display name of the source
  feedback: "buzzer" | "flash" | "both" | "none";
  replay: boolean;
  effectiveAlphabet: string[]; // based on toggles
  extraWordSpacing: number; // Extra space characters to add between words (0-5, for listen/live-copy only)
  listenTimingOffset: 0 | 0.5 | 1.0 | 1.5 | 'word'; // For listen mode: delay in seconds before displaying character (0 = with audio), or 'word' to reveal after complete word (default 1.0)
  characterSpeed: number; // Character speed (WPM) - used differently by each mode (for ditDash: constant speed across all levels)
  learnLesson?: number; // Learn mode specific: lesson number (1-20)
};

export type OutcomeEvent =
  | { type: "correct"; at: number; emissionId: string; latencyMs: number }
  | { type: "timeout"; at: number; emissionId: string }
  | { type: "incorrect"; at: number; emissionId: string; expected: string; got: string };
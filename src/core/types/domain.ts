import type { SessionMode, SpeedTier, ToneSetting } from '../../../functions/shared/types'

// Re-export shared types for convenience
export type { SessionMode, SpeedTier, ToneSetting }

// Session lifecycle
export type SessionConfig = {
  mode: SessionMode;
  lengthMs: number;
  wpm: number;
  effectiveWpm: number; // For Farnsworth timing (when equal to wpm, standard timing is used)
  speedTier: SpeedTier;
  sourceId: string;
  sourceName: string;  // Display name of the source
  feedback: "buzzer" | "flash" | "both" | "none";
  replay: boolean;
  effectiveAlphabet: string[]; // based on toggles
  extraWordSpacing?: number; // Extra space characters to add between words (0-5, for listen/live-copy only)
};

export type OutcomeEvent =
  | { type: "correct"; at: number; emissionId: string; latencyMs: number }
  | { type: "timeout"; at: number; emissionId: string }
  | { type: "incorrect"; at: number; emissionId: string; expected: string; got: string };
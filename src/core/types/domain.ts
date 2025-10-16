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
  listenTimingOffset: number; // For listen mode: when to display character relative to audio duration (-1.0 to 2.0, default 1.0)
  startingLevel: number; // Starting level for runner mode (1-10, default 1)
};

export type OutcomeEvent =
  | { type: "correct"; at: number; emissionId: string; latencyMs: number }
  | { type: "timeout"; at: number; emissionId: string }
  | { type: "incorrect"; at: number; emissionId: string; expected: string; got: string };
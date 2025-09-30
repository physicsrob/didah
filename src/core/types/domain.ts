import type { SessionMode, SpeedTier, ToneSetting } from '../../../functions/shared/types'

// Re-export shared types for convenience
export type { SessionMode, SpeedTier, ToneSetting }

// Configuration
export type UserConfig = {
  wpm: number;                  // character speed in WPM
  includeNumbers: boolean;
  includeStdPunct: boolean;
  includeAdvPunct: boolean;
  sessionDefaults: {
    lengthSec: 60 | 120 | 300;
    mode: SessionMode;
    speedTier: SpeedTier;
    feedback: "buzzer" | "flash" | "both";
    replay: boolean;
    sourceId: string;
  };
};

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

export type Emission = {
  id: string;            // unique per emitted character
  char: string;
  startedAt: number;     // ms, audio start
  windowCloseAt: number; // active: end of recognition window; passive: reveal moment
};

export type InputEvent = {
  at: number;
  key: string;
  emissionId: string;
};

export type OutcomeEvent =
  | { type: "correct"; at: number; emissionId: string; latencyMs: number }
  | { type: "timeout"; at: number; emissionId: string }
  | { type: "incorrect"; at: number; emissionId: string; expected: string; got: string };

export type SessionLog = {
  sessionId: string;
  startedAt: number;
  cfg: SessionConfig;
  events: (InputEvent | OutcomeEvent | Emission)[];
  endedAt: number;
};
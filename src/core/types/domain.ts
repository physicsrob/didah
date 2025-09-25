// Configuration
export type FeedbackMode = 'flash' | 'buzzer' | 'replay' | 'off';

export type UserConfig = {
  wpm: number;                  // character speed in WPM
  includeNumbers: boolean;
  includeStdPunct: boolean;
  includeAdvPunct: boolean;
  sessionDefaults: {
    lengthSec: 60 | 120 | 300;
    mode: "practice" | "listen" | "live-copy";
    speedTier: "slow" | "medium" | "fast" | "lightning";
    feedback: "buzzer" | "flash" | "both";
    replay: boolean;
    sourceId: string;
  };
};

// Session lifecycle
export type SessionConfig = {
  mode: "practice" | "listen" | "live-copy";
  lengthMs: number;
  wpm: number;
  effectiveWpm: number; // For Farnsworth timing (when equal to wpm, standard timing is used)
  speedTier: "slow" | "medium" | "fast" | "lightning";
  sourceId: string;
  sourceName: string;  // Display name of the source
  feedback: "buzzer" | "flash" | "both" | "none";
  replay: boolean;
  effectiveAlphabet: string[]; // based on toggles
  liveCopyFeedback?: "end" | "immediate"; // For Live Copy mode only
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
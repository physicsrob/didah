// Configuration
export type UserConfig = {
  wpm: number;                  // character speed in WPM
  includeNumbers: boolean;
  includeStdPunct: boolean;
  includeAdvPunct: boolean;
  sessionDefaults: {
    lengthSec: 60 | 120 | 300;
    mode: "active" | "passive";
    speedTier: "slow" | "medium" | "fast" | "lightning";
    feedback: "buzzer" | "flash" | "both";
    replay: boolean;
    sourceId: string;
  };
};

// Session lifecycle
export type SessionConfig = {
  mode: "active" | "passive";
  lengthMs: number;
  wpm: number;
  speedTier: "slow" | "medium" | "fast" | "lightning";
  sourceId: string;
  feedback: "buzzer" | "flash" | "both";
  replay: boolean;
  effectiveAlphabet: string[]; // based on toggles
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
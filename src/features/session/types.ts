import type { SessionConfig, Emission } from '../../core/types/domain.js';

// Session phases
export type SessionPhase =
  | 'idle'
  | 'emitting'
  | 'awaitingInput'    // Active mode only
  | 'feedback'         // Active mode only
  | 'preRevealDelay'   // Passive mode only
  | 'reveal'           // Passive mode only
  | 'postRevealDelay'  // Passive mode only
  | 'ended';

// Session events
export type SessionEvent =
  | { type: 'start'; config: SessionConfig }
  | { type: 'audioEnded'; emissionId: string }
  | { type: 'keypress'; key: string; timestamp: number }
  | { type: 'timeout'; kind: 'window' | 'preReveal' | 'postReveal' | 'feedback' }
  | { type: 'advance' }
  | { type: 'end'; reason: 'user' | 'duration' };

// Session context (state)
export interface SessionContext {
  phase: SessionPhase;
  config: SessionConfig | null;
  startedAt: number | null;
  currentEmission: Emission | null;
  previousCharacters: string[];
  sessionId: string | null;
  epoch: number; // For session boundary cancellation only
  activeTimeouts: {
    recognition?: number;  // Current recognition window timeout
    feedback?: number;     // Feedback display timeout (active mode)
    reveal?: number;       // Character reveal timeout (passive mode)
    postReveal?: number;   // Post-reveal delay timeout (passive mode)
  };
}

// Effects that the session can emit
export type Effect =
  | { type: 'playAudio'; char: string; emissionId: string }
  | { type: 'stopAudio' }
  | { type: 'startRecognitionTimeout'; delayMs: number }
  | { type: 'cancelRecognitionTimeout' }
  | { type: 'startFeedbackTimeout'; delayMs: number }
  | { type: 'cancelFeedbackTimeout' }
  | { type: 'startRevealTimeout'; delayMs: number }
  | { type: 'cancelRevealTimeout' }
  | { type: 'startPostRevealTimeout'; delayMs: number }
  | { type: 'cancelPostRevealTimeout' }
  | { type: 'cancelAllTimeouts' } // Only for session end
  | { type: 'showFeedback'; feedbackType: 'correct' | 'incorrect' | 'timeout'; char: string }
  | { type: 'showReplay'; char: string }
  | { type: 'revealCharacter'; char: string }
  | { type: 'hideCharacter' }
  | { type: 'logEvent'; event: any }
  | { type: 'endSession'; reason: 'user' | 'duration' };

// Character source interface for providing next character
export interface CharacterSource {
  next(): string;
}

// Transition result
export interface TransitionResult {
  context: SessionContext;
  effects: Effect[];
}
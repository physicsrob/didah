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
  | { type: 'timeout'; kind: 'window' | 'preReveal' | 'postReveal' }
  | { type: 'tick'; timestamp: number }
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
  epoch: number; // For cancellation
  pendingTimeouts: Set<string>; // Track active timeout IDs
  pendingAdvance?: boolean; // Flag for tick handler to advance immediately
}

// Effects that the session can emit
export type Effect =
  | { type: 'playAudio'; char: string; emissionId: string }
  | { type: 'stopAudio' }
  | { type: 'startTimeout'; kind: 'window' | 'preReveal' | 'postReveal'; delayMs: number; timeoutId: string }
  | { type: 'cancelTimeout'; timeoutId: string }
  | { type: 'showFeedback'; feedbackType: 'correct' | 'incorrect' | 'timeout'; char: string }
  | { type: 'showReplay'; char: string }
  | { type: 'revealCharacter'; char: string }
  | { type: 'hideCharacter' }
  | { type: 'logEvent'; event: any }
  | { type: 'endSession'; reason: 'user' | 'duration' };

// Clock interface for dependency injection
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): string; // returns timeout ID
  clearTimeout(timeoutId: string): void;
}

// Transition result
export interface TransitionResult {
  context: SessionContext;
  effects: Effect[];
}

// Real clock implementation
export class RealClock implements Clock {
  private timeouts = new Map<string, NodeJS.Timeout>();

  now(): number {
    return Date.now();
  }

  setTimeout(callback: () => void, delayMs: number): string {
    const id = Math.random().toString(36);
    const handle = setTimeout(callback, delayMs);
    this.timeouts.set(id, handle);
    return id;
  }

  clearTimeout(timeoutId: string): void {
    const handle = this.timeouts.get(timeoutId);
    if (handle) {
      clearTimeout(handle);
      this.timeouts.delete(timeoutId);
    }
  }
}

// Fake clock for testing
export class FakeClock implements Clock {
  private currentTime = 0;
  private timeouts = new Map<string, { callback: () => void; triggerTime: number }>();
  private nextTimeoutId = 0;

  now(): number {
    return this.currentTime;
  }

  setTimeout(callback: () => void, delayMs: number): string {
    const id = (this.nextTimeoutId++).toString();
    this.timeouts.set(id, {
      callback,
      triggerTime: this.currentTime + delayMs
    });
    return id;
  }

  clearTimeout(timeoutId: string): void {
    this.timeouts.delete(timeoutId);
  }

  // Test utilities
  setTime(time: number): void {
    this.currentTime = time;
  }

  tick(ms: number): void {
    this.currentTime += ms;
    this.flushExpiredTimeouts();
  }

  flushExpiredTimeouts(): void {
    const expired = Array.from(this.timeouts.entries())
      .filter(([_, timeout]) => timeout.triggerTime <= this.currentTime);

    for (const [id, timeout] of expired) {
      this.timeouts.delete(id);
      timeout.callback();
    }
  }

  getPendingTimeouts(): number {
    return this.timeouts.size;
  }
}
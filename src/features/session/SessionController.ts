import type { SessionConfig } from '../../core/types/domain.js';
import type {
  SessionContext,
  SessionEvent,
  SessionPhase
} from './types.js';
import type { EffectRunner, EffectHandlers } from './effects.js';
import { transition } from './transition.js';
import { DefaultEffectRunner } from './effects.js';

export interface SessionController {
  start(config: SessionConfig): void;
  sendEvent(event: SessionEvent): void;
  getPhase(): SessionPhase;
  getCurrentCharacter(): string | null;
  getPreviousCharacters(): string[];
  stop(): void;
}

export class DefaultSessionController implements SessionController {
  private context: SessionContext;
  private effectRunner: EffectRunner;
  private tickTimer: NodeJS.Timeout | null = null;

  constructor(handlers: EffectHandlers = {}) {
    this.context = this.createInitialContext();

    this.effectRunner = new DefaultEffectRunner(
      handlers,
      (kind) => this.sendEvent({ type: 'timeout', kind })
    );
  }

  private createInitialContext(): SessionContext {
    return {
      phase: 'idle',
      config: null,
      startedAt: null,
      currentEmission: null,
      previousCharacters: [],
      sessionId: null,
      epoch: 0,
      pendingTimeouts: new Set()
    };
  }

  start(config: SessionConfig): void {
    this.sendEvent({ type: 'start', config });
    this.startTickTimer();
  }

  private startTickTimer(): void {
    this.stopTickTimer();
    this.tickTimer = setInterval(() => {
      if (this.context.phase !== 'idle' && this.context.phase !== 'ended') {
        this.sendEvent({ type: 'tick', timestamp: Date.now() });
      }
    }, 10); // 10ms tick interval
  }

  private stopTickTimer(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  sendEvent(event: SessionEvent): void {
    const result = transition(this.context, event);
    this.context = result.context;

    // Run all effects
    for (const effect of result.effects) {
      this.effectRunner.run(effect, this.context.epoch);
    }
  }

  getPhase(): SessionPhase {
    return this.context.phase;
  }

  getCurrentCharacter(): string | null {
    return this.context.currentEmission?.char || null;
  }

  getPreviousCharacters(): string[] {
    return [...this.context.previousCharacters];
  }

  stop(): void {
    this.sendEvent({ type: 'end', reason: 'user' });
    this.stopTickTimer();
  }

  // Additional methods for testing and debugging
  getContext(): SessionContext {
    return { ...this.context };
  }

  // Cleanup method
  cleanup(): void {
    this.stopTickTimer();
    if (this.effectRunner && 'cleanup' in this.effectRunner) {
      (this.effectRunner as any).cleanup();
    }
  }
}

// Factory function for easier testing
export function createSessionController(
  handlers: EffectHandlers = {}
): SessionController {
  return new DefaultSessionController(handlers);
}
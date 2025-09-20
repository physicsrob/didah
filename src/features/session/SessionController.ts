import type { SessionConfig } from '../../core/types/domain.js';
import type {
  SessionContext,
  SessionEvent,
  SessionPhase,
  CharacterSource
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
  private characterSource?: CharacterSource;

  constructor(handlers: EffectHandlers = {}, characterSource?: CharacterSource) {
    this.context = this.createInitialContext();
    this.characterSource = characterSource;

    this.effectRunner = new DefaultEffectRunner(
      handlers,
      (kind) => this.sendEvent({ type: 'timeout', kind }),
      () => this.context.activeTimeouts
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
      activeTimeouts: {}
    };
  }

  start(config: SessionConfig): void {
    this.sendEvent({ type: 'start', config });
  }


  sendEvent(event: SessionEvent): void {
    const result = transition(this.context, event, this.characterSource);
    this.context = result.context;

    // Run all effects and track timeout IDs
    for (const effect of result.effects) {
      const timeoutId = this.effectRunner.run(effect, this.context.epoch);

      // Track timeout IDs in context
      if (timeoutId !== undefined) {
        switch (effect.type) {
          case 'startRecognitionTimeout':
            this.context.activeTimeouts.recognition = timeoutId;
            break;
          case 'startFeedbackTimeout':
            this.context.activeTimeouts.feedback = timeoutId;
            break;
          case 'startRevealTimeout':
            this.context.activeTimeouts.reveal = timeoutId;
            break;
          case 'startPostRevealTimeout':
            this.context.activeTimeouts.postReveal = timeoutId;
            break;
        }
      }

      // Clear timeout IDs when canceling
      switch (effect.type) {
        case 'cancelRecognitionTimeout':
          this.context.activeTimeouts.recognition = undefined;
          break;
        case 'cancelFeedbackTimeout':
          this.context.activeTimeouts.feedback = undefined;
          break;
        case 'cancelRevealTimeout':
          this.context.activeTimeouts.reveal = undefined;
          break;
        case 'cancelPostRevealTimeout':
          this.context.activeTimeouts.postReveal = undefined;
          break;
        case 'cancelAllTimeouts':
          this.context.activeTimeouts = {};
          break;
      }
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
  }

  // Additional methods for testing and debugging
  getContext(): SessionContext {
    return { ...this.context };
  }

  // Cleanup method
  cleanup(): void {
    if (this.effectRunner && 'cleanup' in this.effectRunner) {
      (this.effectRunner as any).cleanup();
    }
  }
}

// Factory function for easier testing
export function createSessionController(
  handlers: EffectHandlers = {},
  characterSource?: CharacterSource
): SessionController {
  return new DefaultSessionController(handlers, characterSource);
}
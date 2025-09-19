import type { Effect, Clock } from './types.js';

// Effect runner interface
export interface EffectRunner {
  run(effect: Effect, epoch: number): void;
}

// Effect handlers interface
export interface EffectHandlers {
  onPlayAudio?: (char: string, emissionId: string) => void;
  onStopAudio?: () => void;
  onShowFeedback?: (feedbackType: 'correct' | 'incorrect' | 'timeout', char: string) => void;
  onShowReplay?: (char: string) => void;
  onRevealCharacter?: (char: string) => void;
  onHideCharacter?: () => void;
  onLogEvent?: (event: any) => void;
  onEndSession?: (reason: 'user' | 'duration') => void;
}

// Default effect runner implementation
export class DefaultEffectRunner implements EffectRunner {
  private timeouts = new Map<string, { handle: NodeJS.Timeout; epoch: number }>();

  constructor(
    private handlers: EffectHandlers,
    private onTimeout: (kind: 'window' | 'preReveal' | 'postReveal') => void
  ) {}

  run(effect: Effect, epoch: number): void {
    switch (effect.type) {
      case 'playAudio':
        this.handlers.onPlayAudio?.(effect.char, effect.emissionId);
        break;

      case 'stopAudio':
        this.handlers.onStopAudio?.();
        break;

      case 'startTimeout': {
        const timeoutHandle = setTimeout(() => {
          // Check if this timeout is still valid (epoch check)
          const timeoutInfo = this.timeouts.get(effect.timeoutId);
          if (timeoutInfo && timeoutInfo.epoch === epoch) {
            this.timeouts.delete(effect.timeoutId);
            this.onTimeout(effect.kind);
          }
        }, effect.delayMs);

        this.timeouts.set(effect.timeoutId, { handle: timeoutHandle, epoch });
        break;
      }

      case 'cancelTimeout': {
        const timeoutInfo = this.timeouts.get(effect.timeoutId);
        if (timeoutInfo) {
          clearTimeout(timeoutInfo.handle);
          this.timeouts.delete(effect.timeoutId);
        }
        break;
      }

      case 'showFeedback':
        this.handlers.onShowFeedback?.(effect.feedbackType, effect.char);
        break;

      case 'showReplay':
        this.handlers.onShowReplay?.(effect.char);
        break;

      case 'revealCharacter':
        this.handlers.onRevealCharacter?.(effect.char);
        break;

      case 'hideCharacter':
        this.handlers.onHideCharacter?.();
        break;

      case 'logEvent':
        this.handlers.onLogEvent?.(effect.event);
        break;

      case 'endSession':
        this.handlers.onEndSession?.(effect.reason);
        break;
    }
  }

  // Cleanup method to cancel all pending timeouts
  cleanup(): void {
    for (const [timeoutId, timeoutInfo] of this.timeouts) {
      clearTimeout(timeoutInfo.handle);
    }
    this.timeouts.clear();
  }
}

// Test effect runner that collects effects instead of executing them
export class TestEffectRunner implements EffectRunner {
  public effects: Effect[] = [];

  run(effect: Effect, epoch: number): void {
    this.effects.push(effect);
  }

  clear(): void {
    this.effects = [];
  }

  getEffectsByType<T extends Effect['type']>(type: T): Extract<Effect, { type: T }>[] {
    return this.effects.filter(e => e.type === type) as Extract<Effect, { type: T }>[];
  }
}
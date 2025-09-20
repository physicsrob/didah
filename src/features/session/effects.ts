import type { Effect } from './types.js';

// Effect runner interface
export interface EffectRunner {
  run(effect: Effect, epoch: number): number | void;
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
  private timeouts = new Map<string, { handle: NodeJS.Timeout; epoch: number; kind: string }>();
  private nextTimeoutId = 1;

  constructor(
    private handlers: EffectHandlers,
    private onTimeout: (kind: 'window' | 'preReveal' | 'postReveal' | 'feedback') => void,
    private getActiveTimeouts?: () => { recognition?: number; feedback?: number; reveal?: number; postReveal?: number }
  ) {}

  run(effect: Effect, epoch: number): number | void {
    switch (effect.type) {
      case 'playAudio':
        this.handlers.onPlayAudio?.(effect.char, effect.emissionId);
        break;

      case 'stopAudio':
        this.handlers.onStopAudio?.();
        break;

      case 'startRecognitionTimeout': {
        const timeoutId = `recognition-${this.nextTimeoutId++}`;
        const timeoutHandle = setTimeout(() => {
          // Check if this timeout is still valid (epoch check)
          const timeoutInfo = this.timeouts.get(timeoutId);
          if (timeoutInfo && timeoutInfo.epoch === epoch) {
            this.timeouts.delete(timeoutId);
            this.onTimeout('window');
          }
        }, effect.delayMs);

        this.timeouts.set(timeoutId, { handle: timeoutHandle, epoch, kind: 'recognition' });
        return this.nextTimeoutId - 1; // Return numeric ID for tracking
      }

      case 'cancelRecognitionTimeout':
        // Cancel only recognition timeouts
        for (const [timeoutId, timeoutInfo] of this.timeouts) {
          if (timeoutInfo.kind === 'recognition') {
            clearTimeout(timeoutInfo.handle);
            this.timeouts.delete(timeoutId);
          }
        }
        break;

      case 'startFeedbackTimeout': {
        const timeoutId = `feedback-${this.nextTimeoutId++}`;
        const timeoutHandle = setTimeout(() => {
          const timeoutInfo = this.timeouts.get(timeoutId);
          if (timeoutInfo && timeoutInfo.epoch === epoch) {
            this.timeouts.delete(timeoutId);
            this.onTimeout('feedback');
          }
        }, effect.delayMs);

        this.timeouts.set(timeoutId, { handle: timeoutHandle, epoch, kind: 'feedback' });
        return this.nextTimeoutId - 1;
      }

      case 'cancelFeedbackTimeout':
        // Cancel only feedback timeouts
        for (const [timeoutId, timeoutInfo] of this.timeouts) {
          if (timeoutInfo.kind === 'feedback') {
            clearTimeout(timeoutInfo.handle);
            this.timeouts.delete(timeoutId);
          }
        }
        break;

      case 'startRevealTimeout': {
        const timeoutId = `reveal-${this.nextTimeoutId++}`;
        const timeoutHandle = setTimeout(() => {
          const timeoutInfo = this.timeouts.get(timeoutId);
          if (timeoutInfo && timeoutInfo.epoch === epoch) {
            this.timeouts.delete(timeoutId);
            this.onTimeout('preReveal');
          }
        }, effect.delayMs);

        this.timeouts.set(timeoutId, { handle: timeoutHandle, epoch, kind: 'reveal' });
        return this.nextTimeoutId - 1;
      }

      case 'cancelRevealTimeout':
        // Cancel only reveal timeouts
        for (const [timeoutId, timeoutInfo] of this.timeouts) {
          if (timeoutInfo.kind === 'reveal') {
            clearTimeout(timeoutInfo.handle);
            this.timeouts.delete(timeoutId);
          }
        }
        break;

      case 'startPostRevealTimeout': {
        const timeoutId = `postReveal-${this.nextTimeoutId++}`;
        const timeoutHandle = setTimeout(() => {
          const timeoutInfo = this.timeouts.get(timeoutId);
          if (timeoutInfo && timeoutInfo.epoch === epoch) {
            this.timeouts.delete(timeoutId);
            this.onTimeout('postReveal');
          }
        }, effect.delayMs);

        this.timeouts.set(timeoutId, { handle: timeoutHandle, epoch, kind: 'postReveal' });
        return this.nextTimeoutId - 1;
      }

      case 'cancelPostRevealTimeout':
        // Cancel only post reveal timeouts
        for (const [timeoutId, timeoutInfo] of this.timeouts) {
          if (timeoutInfo.kind === 'postReveal') {
            clearTimeout(timeoutInfo.handle);
            this.timeouts.delete(timeoutId);
          }
        }
        break;

      case 'cancelAllTimeouts': {
        for (const [_, timeoutInfo] of this.timeouts) {
          clearTimeout(timeoutInfo.handle);
        }
        this.timeouts.clear();
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
    for (const [_, timeoutInfo] of this.timeouts) {
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
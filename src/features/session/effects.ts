import type { Effect } from './types.js';
import { AudioEngine, type AudioEngineConfig } from './services/audioEngine.js';

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

// Audio effect handler that manages AudioEngine integration
export class AudioEffectHandler {
  private audioEngine: AudioEngine;
  private currentPlayback: Promise<void> | null = null;

  constructor(config: AudioEngineConfig) {
    this.audioEngine = new AudioEngine(config);
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    await this.audioEngine.initialize();
  }

  /**
   * Update audio configuration
   */
  updateConfig(config: Partial<AudioEngineConfig>): void {
    this.audioEngine.updateConfig(config);
  }

  /**
   * Get effect handlers for use with DefaultEffectRunner
   */
  getHandlers(): Pick<EffectHandlers, 'onPlayAudio' | 'onStopAudio'> {
    return {
      onPlayAudio: async (char: string, emissionId: string) => {
        try {
          // Store the playback promise so we can cancel it if needed
          this.currentPlayback = this.audioEngine.playCharacter(char);
          await this.currentPlayback;
          this.currentPlayback = null;

          // Notify that audio ended (this would typically trigger a callback to the session)
          // The session controller should listen for audio completion to trigger 'audioEnded' event
          this.onAudioEnded?.(emissionId);
        } catch (error) {
          console.error('Error playing audio:', error);
          this.currentPlayback = null;
          // Still notify audio ended even on error to prevent session hanging
          this.onAudioEnded?.(emissionId);
        }
      },

      onStopAudio: async () => {
        try {
          await this.audioEngine.stop();
          this.currentPlayback = null;
        } catch (error) {
          console.error('Error stopping audio:', error);
        }
      },
    };
  }

  /**
   * Callback for when audio playback completes
   * Should be set by the session controller
   */
  onAudioEnded?: (emissionId: string) => void;

  /**
   * Check if audio is currently playing
   */
  get isPlaying(): boolean {
    return this.audioEngine.playing;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.audioEngine.dispose();
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
/**
 * IO Adapter to bridge existing AudioEngine and Feedback systems to the new IO interface
 */

import type { IO, SessionSnapshot, LogEvent } from './io';
import type { AudioEngine } from '../services/audioEngine';
import type { Feedback } from '../services/feedback/feedbackInterface';

/**
 * Configuration for the IO adapter
 */
export type IOAdapterConfig = {
  audioEngine: AudioEngine;
  feedback?: Feedback;
  onReveal?: (char: string) => void;
  onHide?: () => void;
  onLog?: (event: LogEvent) => void;
  onSnapshot?: (snapshot: SessionSnapshot) => void;
  replayDuration?: number; // ms to show replay overlay
};

/**
 * Create an IO adapter that connects existing services to the new runtime
 */
export function createIOAdapter(config: IOAdapterConfig): IO {
  const {
    audioEngine,
    feedback,
    onReveal,
    onHide,
    onLog,
    onSnapshot,
    replayDuration = 1000
  } = config;

  return {
    async playChar(char: string): Promise<void> {
      console.log(`[Audio] Playing '${char}'`);
      try {
        await audioEngine.playCharacter(char);
      } catch (error) {
        // Log but don't throw - let the session continue
        console.warn(`Failed to play audio for char: ${char}`, error);
      }
    },

    async stopAudio(): Promise<void> {
      try {
        await audioEngine.stop();
      } catch (error) {
        console.warn('Failed to stop audio:', error);
      }
    },

    reveal(char: string): void {
      console.log(`[IO] Revealing character: '${char}'`);
      onReveal?.(char);
    },

    hide(): void {
      console.log(`[IO] Hiding character`);
      onHide?.();
    },

    feedback(kind: 'correct' | 'incorrect' | 'timeout', char: string): void {
      console.log(`[Feedback] ${kind} for '${char}'`);
      if (!feedback) {
        console.log(`[Feedback] No feedback handler configured`);
        return;
      }

      switch (kind) {
        case 'correct':
          feedback.onCorrect?.(char);
          break;
        case 'incorrect':
          feedback.onFail(char);
          break;
        case 'timeout':
          feedback.onFail(char);
          break;
      }
    },

    async replay(char: string): Promise<void> {
      console.log(`[Replay] Starting replay for '${char}'`);
      if (!onReveal || !audioEngine) {
        console.log(`[Replay] Missing dependencies - onReveal: ${!!onReveal}, audioEngine: ${!!audioEngine}`);
        return;
      }

      // Show the character
      console.log(`[Replay] Showing character: '${char}'`);
      onReveal(char);

      // Play the audio
      try {
        console.log(`[Replay] Playing audio for '${char}'`);
        await audioEngine.playCharacter(char);
      } catch (error) {
        console.warn(`Failed to replay audio for char: ${char}`, error);
      }

      // Wait a bit for the user to see
      console.log(`[Replay] Waiting ${replayDuration}ms`);
      await new Promise(resolve => setTimeout(resolve, replayDuration));

      // Hide the character
      console.log(`[Replay] Hiding character`);
      onHide?.();
      console.log(`[Replay] Complete for '${char}'`);
    },

    log(event: LogEvent): void {
      onLog?.(event);
    },

    snapshot(snapshot: SessionSnapshot): void {
      onSnapshot?.(snapshot);
    }
  };
}

/**
 * Browser IO adapter that also handles DOM updates
 */
export class BrowserIOAdapter implements IO {
  private config: IOAdapterConfig;
  private replayOverlay: HTMLElement | null = null;

  constructor(config: IOAdapterConfig) {
    this.config = config;
  }

  async playChar(char: string): Promise<void> {
    return this.config.audioEngine.playCharacter(char);
  }

  async stopAudio(): Promise<void> {
    return this.config.audioEngine.stop();
  }

  reveal(char: string): void {
    this.config.onReveal?.(char);
    // Also update DOM if needed
    const revealElement = document.getElementById('passive-reveal');
    if (revealElement) {
      revealElement.textContent = char;
      revealElement.style.visibility = 'visible';
    }
  }

  hide(): void {
    this.config.onHide?.();
    // Also update DOM if needed
    const revealElement = document.getElementById('passive-reveal');
    if (revealElement) {
      revealElement.style.visibility = 'hidden';
    }
  }

  feedback(kind: 'correct' | 'incorrect' | 'timeout', char: string): void {
    if (!this.config.feedback) return;

    switch (kind) {
      case 'correct':
        this.config.feedback.onCorrect?.(char);
        break;
      case 'incorrect':
      case 'timeout':
        this.config.feedback.onFail(char);
        break;
    }

    // Visual feedback in DOM
    this.flashFeedback(kind);
  }

  private flashFeedback(kind: string): void {
    document.body.classList.add(`feedback-${kind}`);
    setTimeout(() => {
      document.body.classList.remove(`feedback-${kind}`);
    }, 200);
  }

  async replay(char: string): Promise<void> {
    // Create or update replay overlay
    if (!this.replayOverlay) {
      this.replayOverlay = document.createElement('div');
      this.replayOverlay.className = 'replay-overlay';
      this.replayOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 10rem;
        font-weight: bold;
        color: white;
        background: rgba(0, 0, 0, 0.8);
        padding: 2rem 3rem;
        border-radius: 1rem;
        z-index: 9999;
        display: none;
      `;
      document.body.appendChild(this.replayOverlay);
    }

    // Show character
    this.replayOverlay.textContent = char;
    this.replayOverlay.style.display = 'block';

    // Play audio
    try {
      await this.config.audioEngine.playCharacter(char);
    } catch (error) {
      console.warn(`Failed to replay audio for char: ${char}`, error);
    }

    // Keep visible for a moment
    await new Promise(resolve => setTimeout(resolve, this.config.replayDuration || 1000));

    // Hide
    this.replayOverlay.style.display = 'none';
  }

  log(event: LogEvent): void {
    this.config.onLog?.(event);

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.log('[Session Event]', event);
    }
  }

  snapshot(snapshot: SessionSnapshot): void {
    this.config.onSnapshot?.(snapshot);
  }

  dispose(): void {
    // Clean up DOM elements
    if (this.replayOverlay) {
      this.replayOverlay.remove();
      this.replayOverlay = null;
    }
  }
}
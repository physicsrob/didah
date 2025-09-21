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
    async playChar(char: string, wpm: number): Promise<void> {
      console.log(`[Audio] Playing '${char}' at ${wpm} WPM`);
      try {
        await audioEngine.playCharacter(char, wpm);
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

    async replay(char: string, wpm: number): Promise<void> {
      console.log(`[Replay] Starting replay for '${char}' at ${wpm} WPM`);
      if (!onReveal || !audioEngine) {
        console.log(`[Replay] Missing dependencies - onReveal: ${!!onReveal}, audioEngine: ${!!audioEngine}`);
        return;
      }

      // Show the character immediately
      console.log(`[Replay] Showing character: '${char}'`);
      onReveal(char);

      // Wait 500ms before playing audio
      console.log(`[Replay] Waiting 500ms before audio`);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Play the audio
      try {
        console.log(`[Replay] Playing audio for '${char}'`);
        await audioEngine.playCharacter(char, wpm);
      } catch (error) {
        console.warn(`Failed to replay audio for char: ${char}`, error);
      }

      // Wait a bit for the user to see (after audio completes)
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
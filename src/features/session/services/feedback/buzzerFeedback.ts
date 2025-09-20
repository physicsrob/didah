/**
 * Buzzer Feedback
 *
 * Provides audio feedback using a different tone frequency for incorrect answers.
 * Uses a short, sharp tone to indicate errors without being too harsh.
 */

import type { Feedback } from './feedbackInterface.js';

export interface BuzzerConfig {
  frequency: number;  // Buzzer frequency in Hz (typically lower than morse tone)
  duration: number;   // Duration in milliseconds
  volume: number;     // Volume (0.0 to 1.0)
}

export class BuzzerFeedback implements Feedback {
  private audioContext: AudioContext | null = null;

  constructor(private config: BuzzerConfig) {
    // Initialize buzzer feedback with config
  }

  /**
   * Initialize audio context
   */
  async initialize(audioContext: AudioContext): Promise<void> {
    this.audioContext = audioContext;
  }

  onFail(_char: string): void {
    this.playBuzzer();
  }

  onCorrect?(_char: string): void {
    // Optional: could play a different positive sound
  }

  dispose(): void {
    // No persistent resources to clean up
  }

  private playBuzzer(): void {
    if (!this.audioContext) {
      console.warn('BuzzerFeedback: Audio context not initialized');
      return;
    }

    try {
      const startTime = this.audioContext.currentTime;
      const duration = this.config.duration / 1000;

      // Create oscillator and gain node
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Configure oscillator for buzzer sound
      oscillator.type = 'square'; // Square wave for more harsh buzzer sound
      oscillator.frequency.setValueAtTime(this.config.frequency, startTime);

      // Configure gain with quick attack and release
      const attackTime = 0.005; // 5ms attack
      const releaseTime = 0.01;  // 10ms release

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(this.config.volume, startTime + attackTime);
      gainNode.gain.setValueAtTime(this.config.volume, startTime + duration - releaseTime);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      // Connect audio graph
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Play the buzzer
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);

      // Cleanup on completion
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };

    } catch (error) {
      console.error('Error playing buzzer:', error);
    }
  }
}

/**
 * Default buzzer configuration
 */
export const DEFAULT_BUZZER_CONFIG: BuzzerConfig = {
  frequency: 200,  // Low frequency for error sound
  duration: 100,   // Short 100ms buzz
  volume: 0.2,     // Quieter than main tone
};
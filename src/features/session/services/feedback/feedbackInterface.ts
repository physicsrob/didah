/**
 * Feedback Interface
 *
 * Defines the contract for feedback adapters that provide user feedback
 * on correct/incorrect character recognition.
 */

export interface Feedback {
  /**
   * Provide feedback for a failed/incorrect character recognition
   */
  onFail(char: string): void;

  /**
   * Provide feedback for a correct character recognition (optional)
   */
  onCorrect?(char: string): void;

  /**
   * Initialize feedback with audio context (optional, for audio-based feedback)
   */
  initialize?(audioContext: AudioContext): Promise<void>;

  /**
   * Cleanup resources if needed
   */
  dispose?(): void;
}

export type FeedbackType = 'buzzer' | 'flash' | 'both';
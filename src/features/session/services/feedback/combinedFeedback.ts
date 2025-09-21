/**
 * Combined Feedback
 *
 * Combines multiple feedback types (buzzer + flash) into a single feedback adapter.
 * Allows users to get both audio and visual feedback simultaneously.
 */

import type { Feedback } from './feedbackInterface.js';
import { BuzzerFeedback, type BuzzerConfig } from './buzzerFeedback.js';
import { FlashFeedback, type FlashConfig } from './flashFeedback.js';

export interface CombinedFeedbackConfig {
  buzzer: BuzzerConfig;
  flash: FlashConfig;
}

export class CombinedFeedback implements Feedback {
  private buzzer: BuzzerFeedback;
  private flash: FlashFeedback;

  constructor(config: CombinedFeedbackConfig) {
    this.buzzer = new BuzzerFeedback(config.buzzer);
    this.flash = new FlashFeedback(config.flash);
  }

  /**
   * Initialize audio context for buzzer
   */
  async initialize(audioContext: AudioContext): Promise<void> {
    await this.buzzer.initialize(audioContext);
  }

  onFail(char: string): void {
    // Trigger both feedback types simultaneously
    this.buzzer.onFail();
    this.flash.onFail(char);
  }

  onCorrect?(char: string): void {
    // Trigger both feedback types for correct answer (if enabled)
    this.buzzer.onCorrect?.();
    this.flash.onCorrect?.(char);
  }

  dispose(): void {
    this.buzzer.dispose();
    this.flash.dispose();
  }
}
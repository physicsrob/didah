/**
 * Feedback Services
 *
 * Export all feedback adapters and utilities
 */

export type { Feedback, FeedbackType } from './feedbackInterface.js';

export { BuzzerFeedback, DEFAULT_BUZZER_CONFIG } from './buzzerFeedback.js';
export type { BuzzerConfig } from './buzzerFeedback.js';

export { FlashFeedback, DEFAULT_FLASH_CONFIG } from './flashFeedback.js';
export type { FlashConfig } from './flashFeedback.js';

export { CombinedFeedback } from './combinedFeedback.js';
export type { CombinedFeedbackConfig } from './combinedFeedback.js';

/**
 * Factory function to create feedback adapters based on type
 */
export function createFeedback(
  type: FeedbackType,
  options?: {
    buzzerConfig?: Partial<BuzzerConfig>;
    flashConfig?: Partial<FlashConfig>;
  }
): Feedback {
  const buzzerConfig = { ...DEFAULT_BUZZER_CONFIG, ...options?.buzzerConfig };
  const flashConfig = { ...DEFAULT_FLASH_CONFIG, ...options?.flashConfig };

  switch (type) {
    case 'buzzer':
      return new BuzzerFeedback(buzzerConfig);

    case 'flash':
      return new FlashFeedback(flashConfig);

    case 'both':
      return new CombinedFeedback({ buzzer: buzzerConfig, flash: flashConfig });

    default:
      throw new Error(`Unknown feedback type: ${type}`);
  }
}
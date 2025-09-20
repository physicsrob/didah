/**
 * Feedback Services
 *
 * Export all feedback adapters and utilities
 */

import type { Feedback, FeedbackType } from './feedbackInterface.js';
import { BuzzerFeedback, DEFAULT_BUZZER_CONFIG } from './buzzerFeedback.js';
import type { BuzzerConfig } from './buzzerFeedback.js';
import { FlashFeedback, DEFAULT_FLASH_CONFIG } from './flashFeedback.js';
import type { FlashConfig } from './flashFeedback.js';
import { CombinedFeedback } from './combinedFeedback.js';
import type { CombinedFeedbackConfig } from './combinedFeedback.js';

export type { Feedback, FeedbackType };
export { BuzzerFeedback, DEFAULT_BUZZER_CONFIG };
export type { BuzzerConfig };
export { FlashFeedback, DEFAULT_FLASH_CONFIG };
export type { FlashConfig };
export { CombinedFeedback };
export type { CombinedFeedbackConfig };

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
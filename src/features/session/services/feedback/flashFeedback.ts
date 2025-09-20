/**
 * Flash Feedback
 *
 * Provides visual feedback by briefly flashing the screen/UI element.
 * Uses CSS classes to trigger animations that are accessible and non-seizure-inducing.
 */

import type { Feedback } from './feedbackInterface.js';

export interface FlashConfig {
  duration: number;        // Flash duration in milliseconds
  intensity: 'subtle' | 'medium' | 'strong'; // Flash intensity level
  element?: HTMLElement;   // Element to flash (defaults to document.body)
}

export class FlashFeedback implements Feedback {
  private currentTimeout: number | null = null;

  constructor(private config: FlashConfig) {
    // Initialize flash feedback with config
  }

  onFail(_char: string): void {
    this.triggerFlash('error');
  }

  onCorrect?(_char: string): void {
    this.triggerFlash('success');
  }

  dispose(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    // Remove any remaining classes
    this.removeFlashClasses();
  }

  private triggerFlash(type: 'error' | 'success'): void {
    const element = this.config.element || document.body;
    const className = `morse-flash-${type}-${this.config.intensity}`;

    // Clear any existing flash
    this.removeFlashClasses();
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }

    // Add flash class
    element.classList.add(className);

    // Remove class after duration
    this.currentTimeout = window.setTimeout(() => {
      element.classList.remove(className);
      this.currentTimeout = null;
    }, this.config.duration);
  }

  private removeFlashClasses(): void {
    const element = this.config.element || document.body;
    const classesToRemove = [
      'morse-flash-error-subtle',
      'morse-flash-error-medium',
      'morse-flash-error-strong',
      'morse-flash-success-subtle',
      'morse-flash-success-medium',
      'morse-flash-success-strong',
    ];

    classesToRemove.forEach(className => {
      element.classList.remove(className);
    });
  }
}

/**
 * Default flash configuration
 */
export const DEFAULT_FLASH_CONFIG: FlashConfig = {
  duration: 150,      // Quick 150ms flash
  intensity: 'medium', // Medium intensity by default
};

/**
 * CSS styles for flash feedback (should be included in your global styles)
 *
 * Example usage in your CSS:
 *
 * .morse-flash-error-subtle {
 *   background-color: rgba(255, 0, 0, 0.1);
 *   transition: background-color 0.05s ease-out;
 * }
 *
 * .morse-flash-error-medium {
 *   background-color: rgba(255, 0, 0, 0.2);
 *   transition: background-color 0.05s ease-out;
 * }
 *
 * .morse-flash-error-strong {
 *   background-color: rgba(255, 0, 0, 0.3);
 *   transition: background-color 0.05s ease-out;
 * }
 *
 * .morse-flash-success-subtle {
 *   background-color: rgba(0, 255, 0, 0.1);
 *   transition: background-color 0.05s ease-out;
 * }
 *
 * .morse-flash-success-medium {
 *   background-color: rgba(0, 255, 0, 0.2);
 *   transition: background-color 0.05s ease-out;
 * }
 *
 * .morse-flash-success-strong {
 *   background-color: rgba(0, 255, 0, 0.3);
 *   transition: background-color 0.05s ease-out;
 * }
 */
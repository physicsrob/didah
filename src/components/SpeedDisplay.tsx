/**
 * Speed Display Component
 *
 * A reusable component for displaying speed information with Farnsworth timing details.
 * Shows formatted speed text with an optional tooltip containing detailed timing information.
 */

import type { SessionConfig } from '../core/types/domain';
import { formatSpeedDisplay } from '../utils/speedDisplay';

/**
 * Props for the SpeedDisplay component
 */
export interface SpeedDisplayProps {
  /** Session configuration containing speed settings */
  config: SessionConfig | {
    mode: SessionConfig['mode'];
    wpm: number;
    farnsworthWpm?: number;
    extraWordSpacing?: number;
  };
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Speed display component
 *
 * Formats and displays speed information based on session configuration.
 * Automatically handles Farnsworth timing and extra word spacing display.
 */
export function SpeedDisplay({ config, className = '' }: SpeedDisplayProps) {
  const speedDisplay = formatSpeedDisplay(config);

  return (
    <span className={className} title={speedDisplay.tooltip}>
      {speedDisplay.text}
    </span>
  );
}

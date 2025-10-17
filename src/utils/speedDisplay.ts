/**
 * Speed Display Utilities
 *
 * Formats speed information for display in the UI based on session mode.
 */

import type { SessionConfig, SessionMode } from '../core/types/domain';

export type SpeedDisplayInfo = {
  text: string;
  tooltip?: string;
};

type ConfigLike = {
  mode: SessionMode;
  wpm: number;
  farnsworthWpm?: number;
  extraWordSpacing?: number;
};

/**
 * Format speed display for a given session configuration
 *
 * Practice mode: "20 WPM"
 * Listen/Live-Copy/Head-Copy with Farnsworth: "20/15 WPM"
 * Listen/Live-Copy with extra spacing: "20/15 WPM (+2 spacing)"
 * Listen/Live-Copy with standard timing and extra spacing: "20 WPM (+2 spacing)"
 *
 * Handles backward compatibility with old statistics that may not have farnsworthWpm/extraWordSpacing
 */
export function formatSpeedDisplay(config: SessionConfig | ConfigLike): SpeedDisplayInfo {
  const { mode, wpm, farnsworthWpm, extraWordSpacing } = config;

  // Practice mode: just show character speed
  // Practice always uses standard timing (farnsworth = wpm) and no extra spacing
  if (mode === 'practice') {
    return {
      text: `${wpm} WPM`,
      tooltip: undefined
    };
  }

  // Runner mode: N/A (header is hidden anyway)
  if (mode === 'runner') {
    return {
      text: `${wpm} WPM`,
      tooltip: undefined
    };
  }

  // For other modes (listen, live-copy, head-copy)
  // Handle backward compatibility - if farnsworthWpm is undefined, assume standard timing
  const effectiveFarnsworthWpm = farnsworthWpm ?? wpm;
  const effectiveExtraSpacing = extraWordSpacing ?? 0;

  const isFarnsworth = effectiveFarnsworthWpm < wpm;
  const hasExtraSpacing = effectiveExtraSpacing > 0 && (mode === 'listen' || mode === 'live-copy');

  let text = '';
  let tooltip = '';

  if (isFarnsworth) {
    text = `${wpm}/${effectiveFarnsworthWpm} WPM`;
    tooltip = `Character Speed: ${wpm} WPM, Effective Speed: ${effectiveFarnsworthWpm} WPM`;

    if (hasExtraSpacing) {
      text += ` (+${effectiveExtraSpacing} spacing)`;
      tooltip += `, Extra Word Spacing: ${effectiveExtraSpacing}`;
    }
  } else {
    // Standard timing (no Farnsworth)
    text = `${wpm} WPM`;

    if (hasExtraSpacing) {
      text += ` (+${effectiveExtraSpacing} spacing)`;
      tooltip = `Speed: ${wpm} WPM, Extra Word Spacing: ${effectiveExtraSpacing}`;
    }
  }

  return { text, tooltip: tooltip || undefined };
}

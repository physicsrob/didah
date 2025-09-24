import type { FeedbackMode } from '../../../core/types/domain'

export type UserSettings = {
  // Core settings
  wpm: number
  effectiveWpm: number  // For Farnsworth timing
  frequency: number  // Audio frequency in Hz
  includeNumbers: boolean
  includeStdPunct: boolean
  includeAdvPunct: boolean

  // Session defaults
  defaultDuration: 60 | 120 | 300
  defaultMode: 'practice' | 'listen' | 'live-copy'
  defaultSpeedTier: 'slow' | 'medium' | 'fast' | 'lightning'
  defaultSourceId: string

  // Active mode settings
  feedbackMode: FeedbackMode

  // Live copy settings
  liveCopyFeedback: 'end' | 'immediate'
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  wpm: 15,
  effectiveWpm: 10,  // Default to slower effective speed for Farnsworth
  frequency: 600,  // Default to 600 Hz (common for Morse code)
  includeNumbers: true,
  includeStdPunct: true,
  includeAdvPunct: false,
  defaultDuration: 60,
  defaultMode: 'practice',
  defaultSpeedTier: 'slow',
  defaultSourceId: 'random_letters',
  feedbackMode: 'replay',  // Default to replay (both + replay)
  liveCopyFeedback: 'end'
}
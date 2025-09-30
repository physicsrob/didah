// Shared types for API functions
export type FeedbackMode = 'flash' | 'buzzer' | 'replay' | 'off'

export type UserSettings = {
  // Core settings
  wpm: number
  effectiveWpm: number  // For Farnsworth timing
  frequency: number  // Audio frequency in Hz
  volume: number  // Audio volume (0.0 to 1.0)
  buzzerVolume: number  // Buzzer volume (0.0 to 1.0)
  tone: 'soft' | 'normal' | 'hard'
  includeNumbers: boolean
  includeStdPunct: boolean
  includeAdvPunct: boolean
  extraWordSpacing: number  // Extra space characters to add between words (0-5)

  // Session defaults
  defaultDuration: 60 | 120 | 300
  defaultMode: 'practice' | 'listen' | 'live-copy'
  defaultSpeedTier: 'slow' | 'medium' | 'fast' | 'lightning'
  defaultSourceId: string

  // Active mode settings
  feedbackMode: FeedbackMode
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  wpm: 15,
  effectiveWpm: 10,  // Default to slower effective speed for Farnsworth
  frequency: 600,  // Default to 600 Hz (common for Morse code)
  volume: 0.2,  // 20% volume
  buzzerVolume: 0.15,  // 15% volume for error feedback
  tone: 'normal',
  includeNumbers: true,
  includeStdPunct: true,
  includeAdvPunct: false,
  extraWordSpacing: 0,  // No extra word spacing by default
  defaultDuration: 60,
  defaultMode: 'practice',
  defaultSpeedTier: 'slow',
  defaultSourceId: 'random_letters',
  feedbackMode: 'replay'  // Default to replay (both + replay)
}

export interface User {
  id: string
  email: string
  name: string
  picture?: string
}

// Validation function for settings
export function validateSettings(settings: unknown): settings is UserSettings {
  if (!settings || typeof settings !== 'object') {
    return false
  }

  const s = settings as Record<string, unknown>

  const requiredFields: (keyof UserSettings)[] = [
    'wpm', 'effectiveWpm', 'frequency', 'volume', 'buzzerVolume', 'tone',
    'includeNumbers', 'includeStdPunct', 'includeAdvPunct', 'extraWordSpacing',
    'defaultDuration', 'defaultMode', 'defaultSpeedTier', 'defaultSourceId',
    'feedbackMode'
  ]

  for (const field of requiredFields) {
    if (!(field in s)) {
      return false
    }
  }

  // Type-specific validations
  if (typeof s.wpm !== 'number' || s.wpm < 5 || s.wpm > 100) {
    return false
  }

  if (typeof s.effectiveWpm !== 'number' || s.effectiveWpm < 5 || s.effectiveWpm > 100) {
    return false
  }

  if (typeof s.frequency !== 'number' || s.frequency < 500 || s.frequency > 1000) {
    return false
  }

  if (typeof s.volume !== 'number' || s.volume < 0 || s.volume > 1) {
    return false
  }

  if (typeof s.buzzerVolume !== 'number' || s.buzzerVolume < 0 || s.buzzerVolume > 1) {
    return false
  }

  if (!['soft', 'normal', 'hard'].includes(s.tone as string)) {
    return false
  }

  if (typeof s.extraWordSpacing !== 'number' || s.extraWordSpacing < 0 || s.extraWordSpacing > 5) {
    return false
  }

  if (![60, 120, 300].includes(s.defaultDuration as number)) {
    return false
  }

  if (!['practice', 'listen', 'live-copy'].includes(s.defaultMode as string)) {
    return false
  }

  if (!['slow', 'medium', 'fast', 'lightning'].includes(s.defaultSpeedTier as string)) {
    return false
  }

  if (!['flash', 'buzzer', 'replay', 'off'].includes(s.feedbackMode as string)) {
    return false
  }

  if (typeof s.includeNumbers !== 'boolean' ||
      typeof s.includeStdPunct !== 'boolean' ||
      typeof s.includeAdvPunct !== 'boolean') {
    return false
  }

  if (typeof s.defaultSourceId !== 'string' || !s.defaultSourceId) {
    return false
  }

  return true
}
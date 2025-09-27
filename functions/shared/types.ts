// Shared types for API functions
export type UserSettings = {
  // Core settings
  wpm: number
  frequency: number
  tone: 'soft' | 'normal' | 'hard'
  includeNumbers: boolean
  includeStdPunct: boolean
  includeAdvPunct: boolean

  // Session defaults
  defaultDuration: 60 | 120 | 300
  defaultMode: 'practice' | 'listen' | 'live-copy'
  defaultSpeedTier: 'slow' | 'medium' | 'fast' | 'lightning'
  defaultSourceId: string

  // Active mode settings
  feedback: 'buzzer' | 'flash' | 'both'
  replay: boolean
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  wpm: 15,
  frequency: 600,
  tone: 'normal',
  includeNumbers: true,
  includeStdPunct: true,
  includeAdvPunct: false,
  defaultDuration: 60,
  defaultMode: 'practice',
  defaultSpeedTier: 'slow',
  defaultSourceId: 'random_letters',
  feedback: 'both',
  replay: true
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

  const requiredFields: (keyof UserSettings)[] = [
    'wpm', 'frequency', 'tone', 'includeNumbers', 'includeStdPunct', 'includeAdvPunct',
    'defaultDuration', 'defaultMode', 'defaultSpeedTier', 'defaultSourceId',
    'feedback', 'replay'
  ]

  for (const field of requiredFields) {
    if (!(field in settings)) {
      return false
    }
  }

  // Type-specific validations
  if (typeof settings.wpm !== 'number' || settings.wpm < 5 || settings.wpm > 100) {
    return false
  }

  if (typeof settings.frequency !== 'number' || settings.frequency < 500 || settings.frequency > 1000) {
    return false
  }

  if (!['soft', 'normal', 'hard'].includes(settings.tone)) {
    return false
  }

  if (![60, 120, 300].includes(settings.defaultDuration)) {
    return false
  }

  if (!['practice', 'listen', 'live-copy'].includes(settings.defaultMode)) {
    return false
  }

  if (!['slow', 'medium', 'fast', 'lightning'].includes(settings.defaultSpeedTier)) {
    return false
  }

  if (!['buzzer', 'flash', 'both'].includes(settings.feedback)) {
    return false
  }

  if (typeof settings.includeNumbers !== 'boolean' ||
      typeof settings.includeStdPunct !== 'boolean' ||
      typeof settings.includeAdvPunct !== 'boolean' ||
      typeof settings.replay !== 'boolean') {
    return false
  }

  if (typeof settings.defaultSourceId !== 'string' || !settings.defaultSourceId) {
    return false
  }

  return true
}
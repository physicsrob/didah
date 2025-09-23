export type UserSettings = {
  // Core settings
  wpm: number
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

  // Live copy settings
  liveCopyFeedback: 'end' | 'immediate'
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  wpm: 15,
  includeNumbers: true,
  includeStdPunct: true,
  includeAdvPunct: false,
  defaultDuration: 60,
  defaultMode: 'practice',
  defaultSpeedTier: 'slow',
  defaultSourceId: 'random_letters',
  feedback: 'both',
  replay: true,
  liveCopyFeedback: 'end'
}
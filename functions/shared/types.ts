// Shared types for API functions
export type FeedbackMode = 'flash' | 'buzzer' | 'replay' | 'off'
export type SessionMode = 'practice' | 'listen' | 'live-copy' | 'word-practice'
export type SpeedTier = 'slow' | 'medium' | 'fast' | 'lightning'
export type ToneSetting = 'soft' | 'normal' | 'hard'

export type UserSettings = {
  // Core settings
  wpm: number
  farnsworthWpm: number  // For Farnsworth timing
  frequency: number  // Audio frequency in Hz
  volume: number  // Audio volume (0.0 to 1.0)
  buzzerVolume: number  // Buzzer volume (0.0 to 1.0)
  tone: ToneSetting
  includeNumbers: boolean
  includeStdPunct: boolean
  includeAdvPunct: boolean
  extraWordSpacing: number  // Extra space characters to add between words (0-5)

  // Session defaults
  defaultDuration: 60 | 120 | 300
  defaultMode: SessionMode
  defaultSpeedTier: SpeedTier
  defaultSourceId: string  // For text modes (Practice, Listen, Live Copy)
  defaultWordSourceId: string  // For Word Practice mode

  // Active mode settings
  feedbackMode: FeedbackMode
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  wpm: 15,
  farnsworthWpm: 10,  // Default to slower effective speed for Farnsworth
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
  defaultWordSourceId: 'top-100',
  feedbackMode: 'replay'  // Default to replay (both + replay)
}

export interface User {
  id: string
  email: string
  name: string
  picture?: string
}

/**
 * Statistics for a single character across all its occurrences in a session
 */
export type CharacterStatistics = {
  char: string
  attempts: number
  correct: number
  incorrect: number
  timeout: number
  accuracy: number              // 0-100 percentage
  recognitionTimes: number[]     // All successful recognition times
  meanRecognitionTimeMs: number
  medianRecognitionTimeMs: number
}

/**
 * Complete statistics for a single practice session
 */
export type SessionStatistics = {
  // Session Metadata
  startedAt: number
  endedAt: number
  durationMs: number
  timestamp?: number  // Unix timestamp when session was saved (ms since epoch)
  config: {
    mode: SessionMode
    lengthMs: number               // Configured session length
    wpm: number
    speedTier: SpeedTier
    sourceId: string
    sourceName?: string            // Display name of the source
    replay: boolean
    feedback: 'buzzer' | 'flash' | 'both' | 'none'
    effectiveAlphabet: string[]    // Characters practiced
  }

  // Overall Metrics
  overallAccuracy: number        // 0-100 percentage (excludes timeouts)
  timeoutPercentage: number      // 0-100 percentage of timeouts
  achievedWpm: number            // Achieved WPM (adjusted for accuracy and timing)
  totalCharacters: number
  correctCount: number
  incorrectCount: number
  timeoutCount: number

  // Per-Character Statistics (JSON-serializable)
  characterStats: Record<string, CharacterStatistics>

  // Confusion Matrix (expected char → what user typed → count) (JSON-serializable)
  confusionMatrix: Record<string, Record<string, number>>

  // Timing Analysis (only successful recognitions)
  meanRecognitionTimeMs: number
  medianRecognitionTimeMs: number
}

// Validation function for settings
export function validateSettings(settings: unknown): settings is UserSettings {
  if (!settings || typeof settings !== 'object') {
    return false
  }

  const s = settings as Record<string, unknown>

  const requiredFields: (keyof UserSettings)[] = [
    'wpm', 'farnsworthWpm', 'frequency', 'volume', 'buzzerVolume', 'tone',
    'includeNumbers', 'includeStdPunct', 'includeAdvPunct', 'extraWordSpacing',
    'defaultDuration', 'defaultMode', 'defaultSpeedTier', 'defaultSourceId', 'defaultWordSourceId',
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

  if (typeof s.farnsworthWpm !== 'number' || s.farnsworthWpm < 5 || s.farnsworthWpm > 100) {
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

  const validTones: ToneSetting[] = ['soft', 'normal', 'hard']
  if (!validTones.includes(s.tone as ToneSetting)) {
    return false
  }

  if (typeof s.extraWordSpacing !== 'number' || s.extraWordSpacing < 0 || s.extraWordSpacing > 5) {
    return false
  }

  if (![60, 120, 300].includes(s.defaultDuration as number)) {
    return false
  }

  const validModes: SessionMode[] = ['practice', 'listen', 'live-copy', 'word-practice']
  if (!validModes.includes(s.defaultMode as SessionMode)) {
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

  if (typeof s.defaultWordSourceId !== 'string' || !s.defaultWordSourceId) {
    return false
  }

  return true
}

// Validation function for session statistics
export function validateSessionStatistics(stats: unknown): stats is SessionStatistics {
  if (!stats || typeof stats !== 'object') {
    return false
  }

  const s = stats as Record<string, unknown>

  // Validate top-level required fields
  const requiredFields: (keyof SessionStatistics)[] = [
    'startedAt', 'endedAt', 'durationMs', 'config',
    'overallAccuracy', 'timeoutPercentage', 'achievedWpm',
    'totalCharacters', 'correctCount', 'incorrectCount', 'timeoutCount',
    'characterStats', 'confusionMatrix',
    'meanRecognitionTimeMs', 'medianRecognitionTimeMs'
  ]

  for (const field of requiredFields) {
    if (!(field in s)) {
      return false
    }
  }

  // Validate timestamps and durations
  if (typeof s.startedAt !== 'number' || s.startedAt < 0) {
    return false
  }

  if (typeof s.endedAt !== 'number' || s.endedAt < 0) {
    return false
  }

  if (typeof s.durationMs !== 'number' || s.durationMs < 0) {
    return false
  }

  if (s.timestamp !== undefined && (typeof s.timestamp !== 'number' || s.timestamp < 0)) {
    return false
  }

  // Validate percentages (0-100)
  if (typeof s.overallAccuracy !== 'number' || s.overallAccuracy < 0 || s.overallAccuracy > 100) {
    return false
  }

  if (typeof s.timeoutPercentage !== 'number' || s.timeoutPercentage < 0 || s.timeoutPercentage > 100) {
    return false
  }

  // Validate WPM (reasonable range)
  if (typeof s.achievedWpm !== 'number' || s.achievedWpm < 0 || s.achievedWpm > 200) {
    return false
  }

  // Validate counts (non-negative integers)
  if (typeof s.totalCharacters !== 'number' || s.totalCharacters < 0 || !Number.isInteger(s.totalCharacters)) {
    return false
  }

  if (typeof s.correctCount !== 'number' || s.correctCount < 0 || !Number.isInteger(s.correctCount)) {
    return false
  }

  if (typeof s.incorrectCount !== 'number' || s.incorrectCount < 0 || !Number.isInteger(s.incorrectCount)) {
    return false
  }

  if (typeof s.timeoutCount !== 'number' || s.timeoutCount < 0 || !Number.isInteger(s.timeoutCount)) {
    return false
  }

  // Validate timing metrics (non-negative)
  if (typeof s.meanRecognitionTimeMs !== 'number' || s.meanRecognitionTimeMs < 0) {
    return false
  }

  if (typeof s.medianRecognitionTimeMs !== 'number' || s.medianRecognitionTimeMs < 0) {
    return false
  }

  // Validate config object
  if (!s.config || typeof s.config !== 'object') {
    return false
  }

  const config = s.config as Record<string, unknown>

  const configRequiredFields = [
    'mode', 'lengthMs', 'wpm', 'speedTier', 'sourceId',
    'replay', 'feedback', 'effectiveAlphabet'
  ]

  for (const field of configRequiredFields) {
    if (!(field in config)) {
      return false
    }
  }

  // Validate config fields
  const validModes: SessionMode[] = ['practice', 'listen', 'live-copy', 'word-practice']
  if (!validModes.includes(config.mode as SessionMode)) {
    return false
  }

  if (typeof config.lengthMs !== 'number' || config.lengthMs < 0) {
    return false
  }

  if (typeof config.wpm !== 'number' || config.wpm < 5 || config.wpm > 100) {
    return false
  }

  const validSpeedTiers: SpeedTier[] = ['slow', 'medium', 'fast', 'lightning']
  if (!validSpeedTiers.includes(config.speedTier as SpeedTier)) {
    return false
  }

  if (typeof config.sourceId !== 'string' || !config.sourceId) {
    return false
  }

  if (config.sourceName !== undefined && typeof config.sourceName !== 'string') {
    return false
  }

  if (typeof config.replay !== 'boolean') {
    return false
  }

  if (!['buzzer', 'flash', 'both', 'none'].includes(config.feedback as string)) {
    return false
  }

  if (!Array.isArray(config.effectiveAlphabet)) {
    return false
  }

  // Validate effectiveAlphabet contains only strings
  for (const char of config.effectiveAlphabet) {
    if (typeof char !== 'string' || char.length !== 1) {
      return false
    }
  }

  // Validate characterStats is an object (Record)
  if (!s.characterStats || typeof s.characterStats !== 'object' || Array.isArray(s.characterStats)) {
    return false
  }

  // Validate each character stat entry
  const charStats = s.characterStats as Record<string, unknown>
  for (const [char, stat] of Object.entries(charStats)) {
    if (typeof char !== 'string' || char.length !== 1) {
      return false
    }

    if (!stat || typeof stat !== 'object') {
      return false
    }

    const cs = stat as Record<string, unknown>

    // Validate CharacterStatistics fields
    if (cs.char !== char) {
      return false
    }

    if (typeof cs.attempts !== 'number' || cs.attempts < 0 || !Number.isInteger(cs.attempts)) {
      return false
    }

    if (typeof cs.correct !== 'number' || cs.correct < 0 || !Number.isInteger(cs.correct)) {
      return false
    }

    if (typeof cs.incorrect !== 'number' || cs.incorrect < 0 || !Number.isInteger(cs.incorrect)) {
      return false
    }

    if (typeof cs.timeout !== 'number' || cs.timeout < 0 || !Number.isInteger(cs.timeout)) {
      return false
    }

    if (typeof cs.accuracy !== 'number' || cs.accuracy < 0 || cs.accuracy > 100) {
      return false
    }

    if (!Array.isArray(cs.recognitionTimes)) {
      return false
    }

    for (const time of cs.recognitionTimes as unknown[]) {
      if (typeof time !== 'number' || time < 0) {
        return false
      }
    }

    if (typeof cs.meanRecognitionTimeMs !== 'number' || cs.meanRecognitionTimeMs < 0) {
      return false
    }

    if (typeof cs.medianRecognitionTimeMs !== 'number' || cs.medianRecognitionTimeMs < 0) {
      return false
    }
  }

  // Validate confusionMatrix is an object (Record)
  if (!s.confusionMatrix || typeof s.confusionMatrix !== 'object' || Array.isArray(s.confusionMatrix)) {
    return false
  }

  // Validate confusion matrix structure
  const confusionMatrix = s.confusionMatrix as Record<string, unknown>
  for (const [expected, confusions] of Object.entries(confusionMatrix)) {
    if (typeof expected !== 'string' || expected.length !== 1) {
      return false
    }

    if (!confusions || typeof confusions !== 'object' || Array.isArray(confusions)) {
      return false
    }

    const confusionRecord = confusions as Record<string, unknown>
    for (const [actual, count] of Object.entries(confusionRecord)) {
      if (typeof actual !== 'string' || actual.length !== 1) {
        return false
      }

      if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
        return false
      }
    }
  }

  return true
}
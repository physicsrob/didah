import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { useSettings } from '../features/settings/hooks/useSettings'
import { useAudio } from '../contexts/useAudio'
import { DEFAULT_WPM } from '../core/config/defaults'
import { BuzzerFeedback, DEFAULT_BUZZER_CONFIG } from '../features/session/services/feedback/buzzerFeedback'
import '../styles/main.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting, isLoading } = useSettings()
  const { initializeAudio, getAudioEngine } = useAudio()
  const debounceTimerRef = useRef<number | null>(null)

  // Build effective alphabet based on toggles
  const buildAlphabet = () => {
    if (!settings) return []
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (settings.includeNumbers) alphabet += '0123456789'
    if (settings.includeStdPunct) alphabet += '.,?/='
    if (settings.includeAdvPunct) alphabet += ':;!@#$%^&*()+-_[]{}|\\<>\'"`~'
    return alphabet.split('')
  }

  const handleBack = () => {
    navigate('/')
  }

  const handleSave = () => {
    // Settings are auto-saved via the store
    navigate('/')
  }

  const handleFrequencyChange = (value: number) => {
    updateSetting('frequency', value)

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        await initializeAudio()
        const audioEngine = getAudioEngine()
        await audioEngine.playCharacter('?', DEFAULT_WPM)
      } catch (error) {
        console.error('Failed to play preview:', error)
      }
    }, 150)
  }

  const handleToneChange = async (tone: 'soft' | 'normal' | 'hard') => {
    updateSetting('tone', tone)

    try {
      await initializeAudio()
      const audioEngine = getAudioEngine()
      await audioEngine.playCharacter('?', DEFAULT_WPM)
    } catch (error) {
      console.error('Failed to play preview:', error)
    }
  }

  const handleVolumeChange = (value: number) => {
    updateSetting('volume', value)

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        await initializeAudio()
        const audioEngine = getAudioEngine()
        await audioEngine.playCharacter('?', DEFAULT_WPM)
      } catch (error) {
        console.error('Failed to play preview:', error)
      }
    }, 150)
  }

  const handleBuzzerVolumeChange = (value: number) => {
    updateSetting('buzzerVolume', value)

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        await initializeAudio()
        const audioEngine = getAudioEngine()
        const audioContext = (audioEngine as unknown as { audioContext?: AudioContext }).audioContext

        if (audioContext) {
          const buzzer = new BuzzerFeedback({
            ...DEFAULT_BUZZER_CONFIG,
            volume: value
          })
          await buzzer.initialize(audioContext)
          buzzer.onFail()
        }
      } catch (error) {
        console.error('Failed to play buzzer preview:', error)
      }
    }, 150)
  }

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-center">
          <h2 className="heading-2">Loading settings...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="w-full px-6 py-10" style={{ maxWidth: '448px' }}>
        <div className="text-center mb-8">
          <h1 className="heading-1">Settings</h1>
        </div>

        {/* Audio Settings */}
        <div className="card mb-6">
          <h2 className="heading-2 mb-6">Audio Settings</h2>

          <div className="form-group mb-6">
            <label className="form-label">Tone</label>
            <div className="segmented-control" style={{ marginTop: '8px' }}>
              {(['soft', 'normal', 'hard'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => handleToneChange(tone)}
                  className={settings.tone === tone ? 'segmented-btn active' : 'segmented-btn'}
                  style={{ textTransform: 'capitalize' }}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Frequency: {settings.frequency} Hz</label>
            <input
              type="range"
              value={settings.frequency}
              onChange={(e) => {
                const value = parseInt(e.target.value)
                handleFrequencyChange(value)
              }}
              min="500"
              max="1000"
              step="10"
              className="form-slider"
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              <span>500 Hz</span>
              <span>750 Hz</span>
              <span>1000 Hz</span>
            </div>
            <p className="body-small text-muted mt-2">
              Adjust the tone frequency for Morse code audio. Common range: 600-700 Hz
            </p>
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Volume: {Math.round(settings.volume * 100)}%</label>
            <input
              type="range"
              value={settings.volume}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                handleVolumeChange(value)
              }}
              min="0"
              max="1"
              step="0.05"
              className="form-slider"
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <p className="body-small text-muted mt-2">
              Adjust the volume for Morse code audio
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Buzzer Volume: {Math.round(settings.buzzerVolume * 100)}%</label>
            <input
              type="range"
              value={settings.buzzerVolume}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                handleBuzzerVolumeChange(value)
              }}
              min="0"
              max="1"
              step="0.05"
              className="form-slider"
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <p className="body-small text-muted mt-2">
              Adjust the volume for error feedback buzzer
            </p>
          </div>
        </div>

        {/* Character Sets */}
        <div className="card mb-6">
          <h2 className="heading-2 mb-6">Character Sets</h2>

          <div className="space-y-4">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.includeNumbers}
                onChange={(e) => updateSetting('includeNumbers', e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--color-blue-primary)',
                }}
              />
              <span>Include numbers (0-9)</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.includeStdPunct}
                onChange={(e) => updateSetting('includeStdPunct', e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--color-blue-primary)',
                }}
              />
              <span>Include standard punctuation (. , ? / =)</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.includeAdvPunct}
                onChange={(e) => updateSetting('includeAdvPunct', e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--color-blue-primary)',
                }}
              />
              <span>Include advanced punctuation (: ; ! @ # $ etc.)</span>
            </label>
          </div>

          <div className="mt-4 p-3 bg-surface-light rounded" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <p className="body-small text-muted">
              <strong>Active characters:</strong> {buildAlphabet().join(' ')}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="btn btn-secondary flex-1"
            onClick={handleBack}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={handleSave}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

import { useRef } from 'react'
import type { ToneSetting } from '../../core/types/domain'
import { useSettings } from '../../features/settings/hooks/useSettings'
import { useAudio } from '../../contexts/useAudio'
import { DEFAULT_WPM } from '../../core/config/defaults'
import { BuzzerFeedback, DEFAULT_BUZZER_CONFIG } from '../../features/session/services/feedback/buzzerFeedback'

export default function AudioTab() {
  const { settings, updateSetting } = useSettings()
  const { initializeAudio, getAudioEngine } = useAudio()
  const debounceTimerRef = useRef<number | null>(null)

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

  const handleToneChange = async (tone: ToneSetting) => {
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
        const audioContext = audioEngine.getAudioContext()

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

  if (!settings) return null

  return (
    <div>
      <div className="settings-row">
        <div className="settings-label">Tone</div>
        <div className="settings-control">
          <div className="segmented-control">
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
      </div>

      <div className="settings-row">
        <div className="settings-label">Frequency</div>
        <div className="settings-control">
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
            style={{
              flex: 1,
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
          />
          <span style={{
            color: '#4dabf7',
            fontSize: '16px',
            fontWeight: '500',
            minWidth: '80px',
            textAlign: 'right'
          }}>
            {settings.frequency} Hz
          </span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">Volume</div>
        <div className="settings-control">
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
            style={{
              flex: 1,
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
          />
          <span style={{
            color: '#4dabf7',
            fontSize: '16px',
            fontWeight: '500',
            minWidth: '80px',
            textAlign: 'right'
          }}>
            {Math.round(settings.volume * 100)}%
          </span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">Buzzer Volume</div>
        <div className="settings-control">
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
            style={{
              flex: 1,
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
          />
          <span style={{
            color: '#4dabf7',
            fontSize: '16px',
            fontWeight: '500',
            minWidth: '80px',
            textAlign: 'right'
          }}>
            {Math.round(settings.buzzerVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
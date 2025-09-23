import { useNavigate } from 'react-router-dom'
import { useSettings } from '../features/settings/hooks/useSettings'
import '../styles/main.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting, isLoading } = useSettings()

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

        {/* Active Mode Settings */}
        <div className="card mb-6">
          <h2 className="heading-2 mb-6">Active Mode Settings</h2>

          {/* Feedback Type */}
          <div className="form-group mb-6">
            <label className="form-label">Error Feedback</label>
            <div className="flex gap-3">
              <button
                className={`btn btn-small ${settings.feedback === 'buzzer' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateSetting('feedback', 'buzzer')}
              >
                Buzzer
              </button>
              <button
                className={`btn btn-small ${settings.feedback === 'flash' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateSetting('feedback', 'flash')}
              >
                Flash
              </button>
              <button
                className={`btn btn-small ${settings.feedback === 'both' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateSetting('feedback', 'both')}
              >
                Both
              </button>
            </div>
          </div>

          {/* Replay on Timeout */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.replay}
                onChange={(e) => updateSetting('replay', e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--color-blue-primary)',
                }}
              />
              <span>Show missed characters</span>
            </label>
            <p className="body-small text-muted mt-2">
              When you timeout in active mode, display the character with its Morse pattern
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
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import '../styles/main.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [wpm, setWpm] = useState(20)
  const [enableNumbers, setEnableNumbers] = useState(true)
  const [enablePunctuation, setEnablePunctuation] = useState(true)

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient">
      <div className="max-w-md w-full px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="heading-1">Settings</h1>
        </div>

        <div className="card mb-6">
          <div className="form-group">
            <label className="form-label">Character Speed (WPM)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="40"
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                className="flex-1"
                style={{
                  background: 'var(--color-secondary-gray)',
                  height: '8px',
                  borderRadius: '4px',
                  outline: 'none',
                }}
              />
              <span className="heading-3 min-w-[50px] text-right">{wpm}</span>
            </div>
          </div>

          <div className="divider"></div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enableNumbers}
                onChange={(e) => setEnableNumbers(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--color-blue-primary)',
                }}
              />
              <span>Enable Numbers</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enablePunctuation}
                onChange={(e) => setEnablePunctuation(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--color-blue-primary)',
                }}
              />
              <span>Enable Punctuation</span>
            </label>
          </div>

          <div className="divider"></div>

          <div className="text-center">
            <p className="caption text-muted">
              Settings will be saved locally and persist between sessions.
            </p>
            <p className="caption text-warning mt-2">
              Note: Settings persistence coming in next update
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
            onClick={handleBack}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
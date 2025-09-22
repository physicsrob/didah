import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import '../styles/main.css'

type FeedbackType = 'buzzer' | 'flash' | 'both'

export default function SettingsPage() {
  const navigate = useNavigate()

  // Load settings from localStorage or use defaults
  const [feedback, setFeedback] = useState<FeedbackType>(() => {
    const saved = localStorage.getItem('feedback')
    return (saved as FeedbackType) || 'both'
  })

  const [replay, setReplay] = useState(() => {
    const saved = localStorage.getItem('replay')
    return saved !== 'false' // Default true
  })

  const [includeNumbers, setIncludeNumbers] = useState(() => {
    const saved = localStorage.getItem('includeNumbers')
    return saved !== 'false' // Default true
  })

  const [includeStdPunct, setIncludeStdPunct] = useState(() => {
    const saved = localStorage.getItem('includeStdPunct')
    return saved !== 'false' // Default true
  })

  const [includeAdvPunct, setIncludeAdvPunct] = useState(() => {
    const saved = localStorage.getItem('includeAdvPunct')
    return saved === 'true' // Default false
  })

  // Build effective alphabet based on toggles
  const buildAlphabet = () => {
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (includeNumbers) alphabet += '0123456789'
    if (includeStdPunct) alphabet += '.,?/='
    if (includeAdvPunct) alphabet += ':;!@#$%^&*()+-_[]{}|\\<>\'"`~'
    return alphabet.split('')
  }

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('feedback', feedback)
    localStorage.setItem('replay', String(replay))
    localStorage.setItem('includeNumbers', String(includeNumbers))
    localStorage.setItem('includeStdPunct', String(includeStdPunct))
    localStorage.setItem('includeAdvPunct', String(includeAdvPunct))
  }, [feedback, replay, includeNumbers, includeStdPunct, includeAdvPunct])

  const handleBack = () => {
    navigate('/')
  }

  const handleSave = () => {
    // Settings are auto-saved via useEffect
    navigate('/')
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
                className={`btn btn-small ${feedback === 'buzzer' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFeedback('buzzer')}
              >
                Buzzer
              </button>
              <button
                className={`btn btn-small ${feedback === 'flash' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFeedback('flash')}
              >
                Flash
              </button>
              <button
                className={`btn btn-small ${feedback === 'both' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFeedback('both')}
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
                checked={replay}
                onChange={(e) => setReplay(e.target.checked)}
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
                checked={includeNumbers}
                onChange={(e) => setIncludeNumbers(e.target.checked)}
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
                checked={includeStdPunct}
                onChange={(e) => setIncludeStdPunct(e.target.checked)}
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
                checked={includeAdvPunct}
                onChange={(e) => setIncludeAdvPunct(e.target.checked)}
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
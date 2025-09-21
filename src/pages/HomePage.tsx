import { useNavigate } from 'react-router-dom'
import { useAudio } from '../contexts/useAudio'
import '../styles/main.css'

export default function HomePage() {
  const navigate = useNavigate()
  const { initializeAudio } = useAudio()

  const handleModeSelect = async (mode: 'practice' | 'listen' | 'live-copy') => {
    // Initialize audio while we have user gesture context
    await initializeAudio()

    // Navigate to session configuration page with pre-selected mode
    navigate('/session-config', { state: { mode } })
  }

  const handleStatistics = () => {
    navigate('/statistics')
  }

  const handleSettings = () => {
    navigate('/settings')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient">
      <div className="max-w-sm w-full px-6 py-10">
        <h1 className="brand-title text-center mb-16" style={{ fontSize: '48px' }}>
          CodeBeat
        </h1>

        <div className="flex flex-col gap-5 items-center">
          <div className="w-full space-y-6 mb-6">
            <div className="text-center">
              <button
                className="btn btn-primary btn-large w-full mb-2"
                onClick={() => handleModeSelect('practice')}
              >
                Practice
              </button>
              <p className="text-sm text-muted">Interactive mode - type what you hear</p>
            </div>
            <div className="text-center">
              <button
                className="btn btn-primary btn-large w-full mb-2"
                onClick={() => handleModeSelect('listen')}
              >
                Listen
              </button>
              <p className="text-sm text-muted">Pure listening - characters revealed after playing</p>
            </div>
            <div className="text-center">
              <button
                className="btn btn-primary btn-large w-full mb-2"
                onClick={() => handleModeSelect('live-copy')}
              >
                Live Copy
              </button>
              <p className="text-sm text-muted">Real-time copying - continuous transmission</p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-large w-full"
            onClick={handleStatistics}
          >
            Statistics
          </button>
          <button
            className="btn btn-secondary btn-large w-full"
            onClick={handleSettings}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}
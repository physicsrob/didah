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
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      {/* Placeholder top navigation */}
      <nav style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 10 }}>
        <div className="flex gap-5">
          <span className="nav-link-placeholder">About</span>
          <span className="nav-link-placeholder">Login</span>
        </div>
      </nav>

      <div className="w-full px-6 py-10" style={{ maxWidth: '500px', position: 'relative', zIndex: 1 }}>
        <h1 className="brand-title text-center mb-4" style={{ fontSize: '48px' }}>
          MorseAcademy
        </h1>
        <p className="text-muted text-center text-lg mb-16">
          Flow state learning for morse code mastery
        </p>

        <div className="flex flex-col gap-8 items-center">
          {/* Practice modes */}
          <div className="flex flex-col gap-4 w-full">
            <button
              className="btn btn-primary btn-large w-full"
              onClick={() => handleModeSelect('practice')}
            >
              Practice
            </button>
            <button
              className="btn btn-secondary btn-large w-full"
              onClick={() => handleModeSelect('listen')}
            >
              Listen
            </button>
            <button
              className="btn btn-secondary btn-large w-full"
              onClick={() => handleModeSelect('live-copy')}
            >
              Live Copy
            </button>
          </div>

          {/* Utility buttons */}
          <div className="flex gap-5 w-full">
            <button
              className="btn btn-utility flex-1"
              onClick={handleStatistics}
            >
              Statistics
            </button>
            <button
              className="btn btn-utility flex-1"
              onClick={handleSettings}
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
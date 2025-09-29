import { useNavigate } from 'react-router-dom'
import { useAudio } from '../contexts/useAudio'
import { useAuth } from '../hooks/useAuth'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { UserDropdown } from '../components/UserDropdown'
import '../styles/main.css'

export default function HomePage() {
  const navigate = useNavigate()
  const { initializeAudio } = useAudio()
  const { user, handleCredentialResponse, error } = useAuth()

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
    <div className="min-h-screen flex items-center justify-center">
      {/* Top navigation */}
      <nav style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {user ? (
            <UserDropdown />
          ) : error ? (
            <span className="text-error text-xs" title={error}>
              Auth Error
            </span>
          ) : (
            <GoogleSignInButton onCredentialResponse={handleCredentialResponse} />
          )}
        </div>
      </nav>

      <div className="w-full px-6 py-10" style={{ maxWidth: '500px', position: 'relative', zIndex: 1 }}>
        <h1 className="brand-title text-center mb-4" style={{ fontSize: '48px' }}>
          MorseAcademy
        </h1>
        <p className="text-muted text-center text-lg mb-16">
          Flow state learning for morse code mastery
        </p>

        {/* Show error banner if there's a critical auth error */}
        {error && (
          <div className="bg-error text-white p-3 rounded-lg mb-6 text-sm">
            <strong>Authentication Error:</strong> {error}
          </div>
        )}

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
              className={`btn btn-utility flex-1 ${!user ? 'btn-disabled' : ''}`}
              onClick={handleStatistics}
              disabled={!user}
              title={!user ? 'Sign in to view statistics' : ''}
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
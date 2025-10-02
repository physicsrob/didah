import { useNavigate } from 'react-router-dom'
import type { SessionMode } from '../core/types/domain'
import { useAudio } from '../hooks/useAudio'
import { useAuth } from '../hooks/useAuth'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { UserDropdown } from '../components/UserDropdown'
import '../styles/main.css'
import '../styles/homePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const { initializeAudio } = useAudio()
  const { user, handleCredentialResponse, error } = useAuth()

  const handleModeSelect = async (mode: SessionMode) => {
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
      <nav className="home-nav">
        <div className="home-nav-items">
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

      <div className="w-full px-6 py-10 home-content-wrapper">
        <h1 className="brand-title text-center mb-4 home-title">
          MorseAcademy
        </h1>
        <p className="text-center text-lg mb-16 home-subtitle">
          Flow state learning for morse code mastery
        </p>

        {/* Show error banner if there's a critical auth error */}
        {error && (
          <div className="bg-error text-white p-3 rounded-lg mb-6 text-sm">
            <strong>Authentication Error:</strong> {error}
          </div>
        )}

        <div className="flex flex-col gap-8 items-center">
          {/* Mode selection cards */}
          <div className="mode-cards-container">
            <div
              className="mode-card"
              onClick={() => handleModeSelect('practice')}
            >
              <div className="mode-card-icon">⌨️</div>
              <div className="mode-card-title">Practice</div>
              <div className="mode-card-description">
                Interactive training where you type what you hear. Control your own pacing and get immediate feedback on errors.
              </div>
            </div>
            <div
              className="mode-card"
              onClick={() => handleModeSelect('listen')}
            >
              <div className="mode-card-icon">🎧</div>
              <div className="mode-card-title">Listen</div>
              <div className="mode-card-description">
                Passive learning where characters are revealed after playing. Perfect for familiarizing yourself with patterns.
              </div>
            </div>
            <div
              className="mode-card"
              onClick={() => handleModeSelect('live-copy')}
            >
              <div className="mode-card-icon">⚡</div>
              <div className="mode-card-title">Live Copy</div>
              <div className="mode-card-description">
                Real-time copying like actual CW. Characters stream continuously with no feedback until the session ends.
              </div>
            </div>
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
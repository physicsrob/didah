import { useNavigate } from 'react-router-dom'
import type { SessionMode } from '../core/types/domain'
import { useAudio } from '../hooks/useAudio'
import { useAuth } from '../hooks/useAuth'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { UserDropdown } from '../components/UserDropdown'
import { ModeCarousel } from '../components/ModeCarousel'
import '../styles/main.css'
import '../styles/homePage.css'

const MODES = [
  {
    mode: 'practice' as SessionMode,
    icon: '⌨️',
    title: 'Practice',
    description: 'Interactive training where you type what you hear. Control your own pacing and get immediate feedback on errors.'
  },
  {
    mode: 'listen' as SessionMode,
    icon: '🎧',
    title: 'Listen',
    description: 'Passive learning where characters are revealed after playing. Perfect for familiarizing yourself with patterns.'
  },
  {
    mode: 'live-copy' as SessionMode,
    icon: '⚡',
    title: 'Live Copy',
    description: 'Real-time copying like actual CW. Characters stream continuously with no feedback until the session ends.'
  },
  {
    mode: 'word-practice' as SessionMode,
    icon: '📝',
    title: 'Word Practice',
    description: 'Multiple choice word recognition. Select the correct word from 3 options to build whole-word fluency.'
  },
  {
    mode: 'runner' as SessionMode,
    icon: '🏃',
    title: 'Morse Runner',
    description: 'Endless runner mini-game! Type letters to jump over obstacles. Progress through 10 levels with increasing speed.'
  }
];

export default function HomePage() {
  const navigate = useNavigate()
  const { initializeAudio } = useAudio()
  const { user, handleCredentialResponse, error } = useAuth()

  const handleModeSelect = async (mode: SessionMode) => {
    // Initialize audio while we have user gesture context
    await initializeAudio()

    // Navigate to session page for the selected mode
    navigate(`/session/${mode}`)
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
          {/* Mode selection carousel */}
          <ModeCarousel modes={MODES} onModeSelect={handleModeSelect} />

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

        {/* Footer */}
        <footer className="home-footer">
          <div className="home-footer-content">
            <button onClick={() => navigate('/about')} className="footer-link">
              About
            </button>
            <span className="footer-separator">•</span>
            <a
              href="http://github.com/physicsrob/morseacademy"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}
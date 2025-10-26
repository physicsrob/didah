import { useNavigate } from 'react-router-dom'
import type { SessionMode } from '../core/types/domain'
import { useAudio } from '../hooks/useAudio'
import { useUser } from '@clerk/clerk-react'
import { SignInButton } from '@clerk/clerk-react'
import { UserDropdown } from '../components/UserDropdown'
import '../styles/main.css'
import '../styles/homePage.css'

const MODES = [
  {
    mode: 'learn' as SessionMode,
    icon: '🎓',
    title: 'Learn Mode',
    description: 'Start here to learn morse code from scratch using the Koch method.'
  },
  {
    mode: 'practice' as SessionMode,
    icon: '⌨️',
    title: 'Letter Practice',
    description: 'Type what you hear. Immediate feedback paced to your speed.'
  },
  {
    mode: 'ditDash' as SessionMode,
    icon: '🏃',
    title: 'Dit Dash',
    description: 'Endless runner mini-game! Type letters to jump over obstacles.'
  },
  {
    mode: 'head-copy' as SessionMode,
    icon: '🧠',
    title: 'Head Copy',
    description: 'Multiple choice whole-word recognition. Select the correct word to build up the ability to head copy.'
  },
  {
    mode: 'live-copy' as SessionMode,
    icon: '⚡',
    title: 'Live Copy',
    description: 'Real-time copying like actual CW. Characters stream continuously with no feedback until the end.'
  },
  {
    mode: 'listen' as SessionMode,
    icon: '🎧',
    title: 'Listen',
    description: 'Passive listening where characters are revealed after playing.'
  }
];

export default function HomePage() {
  const navigate = useNavigate()
  const { initializeAudio } = useAudio()
  const { user, isLoaded } = useUser()

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
          <button
            className={`home-nav-button ${!user ? 'disabled' : ''}`}
            onClick={handleStatistics}
            disabled={!user}
            title={!user ? 'Sign in to view statistics' : ''}
          >
            <span className="home-nav-button-icon">📊</span>
            <span className="home-nav-button-text">Statistics</span>
          </button>
          <button
            className="home-nav-button home-nav-button--settings"
            onClick={handleSettings}
          >
            <span className="home-nav-button-icon">⚙️</span>
            <span className="home-nav-button-text">Settings</span>
          </button>
          {isLoaded && user ? (
            <UserDropdown />
          ) : isLoaded ? (
            <SignInButton mode="modal">
              <button className="btn btn-utility btn-small">Sign In</button>
            </SignInButton>
          ) : null}
        </div>
      </nav>

      <div className="w-full px-6 py-10 home-content-wrapper">
        <div className="logo-container">
          <img src="/logo.svg" alt="didah" className="logo" />
        </div>
        <p className="text-center text-lg home-subtitle">
          Flow state learning for morse code mastery
        </p>

        <div className="flex flex-col gap-8 items-center">
          {/* Mode selection grid */}
          <div className="mode-grid">
            {MODES.map((mode) => (
              <div
                key={mode.mode}
                className="mode-card"
                onClick={() => handleModeSelect(mode.mode)}
              >
                <div className="mode-card-icon">{mode.icon}</div>
                <div className="mode-card-title">{mode.title}</div>
                <div className="mode-card-description">{mode.description}</div>
              </div>
            ))}
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
              href="http://github.com/physicsrob/didah"
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

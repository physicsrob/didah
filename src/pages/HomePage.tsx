import { useNavigate } from 'react-router-dom'
import '../styles/main.css'

export default function HomePage() {
  const navigate = useNavigate()

  const handleStartSession = () => {
    navigate('/session')
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
          <button
            className="btn btn-primary btn-large w-full"
            onClick={handleStartSession}
          >
            Start Session
          </button>
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
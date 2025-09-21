import { useNavigate } from 'react-router-dom'
import '../styles/main.css'

export default function StatisticsPage() {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient">
      <div className="max-w-md w-full px-6 py-10">
        <div className="text-center">
          <h1 className="heading-1 mb-6">Statistics</h1>

          <div className="card mb-8">
            <div className="flex items-center justify-center" style={{ minHeight: '200px' }}>
              <div className="text-center">
                <div className="text-muted mb-4">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4">
                    <path d="M3 12h4l3 9l4-18l3 9h4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="heading-3 mb-2">Coming Soon</h2>
                <p className="body-regular text-muted">
                  Statistics tracking will be available in the next update.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card-compact surface">
              <div className="flex justify-between items-center">
                <span className="label">Total Sessions</span>
                <span className="heading-3">-</span>
              </div>
            </div>

            <div className="card-compact surface">
              <div className="flex justify-between items-center">
                <span className="label">Average Accuracy</span>
                <span className="heading-3">-</span>
              </div>
            </div>

            <div className="card-compact surface">
              <div className="flex justify-between items-center">
                <span className="label">Study Time</span>
                <span className="heading-3">-</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-large mt-8"
            onClick={handleBack}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}
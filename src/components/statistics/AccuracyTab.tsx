export default function AccuracyTab() {
  return (
    <div className="text-center">
      <h2 className="heading-2 mb-2">Accuracy Over Time</h2>
      <p className="body-regular text-muted mb-8">Track your recognition accuracy improvements</p>

      <div className="card p-8">
        <div className="flex items-center justify-center stats-placeholder">
          <div>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-muted">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 9h18M9 21V9" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="heading-3 mb-2">No Accuracy Data</h3>
            <p className="body-regular text-muted">
              Accuracy tracking will appear here after your first session
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
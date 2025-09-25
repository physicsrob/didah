export default function HistoryTab() {
  return (
    <div className="text-center">
      <h2 className="heading-2 mb-2">Session History</h2>
      <p className="body-regular text-muted mb-8">Your recent practice sessions</p>

      <div className="card p-8">
        <div className="flex items-center justify-center stats-placeholder">
          <div>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-muted">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="heading-3 mb-2">No Session History</h3>
            <p className="body-regular text-muted">
              Your completed sessions will be listed here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
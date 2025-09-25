export default function ConfusionTab() {
  return (
    <div className="text-center">
      <h2 className="heading-2 mb-2">Confusion Matrix</h2>
      <p className="body-regular text-muted mb-8">Characters you frequently confuse</p>

      <div className="card p-8">
        <div className="flex items-center justify-center stats-placeholder">
          <div>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-muted">
              <rect x="3" y="3" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="14" y="3" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="14" y="14" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="3" y="14" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="heading-3 mb-2">No Confusion Data</h3>
            <p className="body-regular text-muted">
              Common mistakes will be analyzed and shown here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
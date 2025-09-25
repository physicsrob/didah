export default function SpeedTab() {
  return (
    <div className="text-center">
      <h2 className="heading-2 mb-2">Recognition Speed</h2>
      <p className="body-regular text-muted mb-8">Your character recognition speed over time</p>

      <div className="card p-8">
        <div className="flex items-center justify-center stats-placeholder">
          <div>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-muted">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="heading-3 mb-2">No Speed Data</h3>
            <p className="body-regular text-muted">
              Speed metrics will be tracked in practice mode
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
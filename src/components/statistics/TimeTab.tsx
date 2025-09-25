export default function TimeTab() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="heading-2 mb-2">Study Time</h2>
        <p className="body-regular text-muted">Your practice time and session statistics</p>
      </div>

      <div className="grid grid-cols-auto gap-4">
        <div className="card-compact surface">
          <div className="text-center p-4">
            <div className="label mb-2">Total Sessions</div>
            <div className="heading-1">-</div>
          </div>
        </div>

        <div className="card-compact surface">
          <div className="text-center p-4">
            <div className="label mb-2">Average Accuracy</div>
            <div className="heading-1">-</div>
          </div>
        </div>

        <div className="card-compact surface">
          <div className="text-center p-4">
            <div className="label mb-2">Study Time</div>
            <div className="heading-1">-</div>
          </div>
        </div>

        <div className="card-compact surface">
          <div className="text-center p-4">
            <div className="label mb-2">Characters/Min</div>
            <div className="heading-1">-</div>
          </div>
        </div>
      </div>

      <div className="card p-6 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-muted">
          <path d="M3 12h4l3 9l4-18l3 9h4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="body-regular text-muted">
          Start practicing to track your progress
        </p>
      </div>
    </div>
  )
}
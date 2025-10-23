import './InlineToggle.css'

interface InlineToggleProps {
  checked: boolean
}

export function InlineToggle({ checked }: InlineToggleProps) {
  return (
    <div className="inline-toggle">
      <div className={`inline-toggle-track ${checked ? 'inline-toggle-track--checked' : ''}`}>
        <div className="inline-toggle-thumb"></div>
      </div>
    </div>
  )
}

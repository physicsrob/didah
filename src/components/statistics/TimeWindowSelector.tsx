interface TimeWindowSelectorProps {
  value: 7 | 30;
  onChange: (value: 7 | 30) => void;
}

export default function TimeWindowSelector({ value, onChange }: TimeWindowSelectorProps) {
  return (
    <div className="graph-controls">
      <button
        className={`time-toggle ${value === 7 ? 'active' : ''}`}
        onClick={() => onChange(7)}
      >
        Last 7 Days
      </button>
      <button
        className={`time-toggle ${value === 30 ? 'active' : ''}`}
        onClick={() => onChange(30)}
      >
        Last 30 Days
      </button>
    </div>
  );
}
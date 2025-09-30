import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { SessionStatisticsWithMaps } from '../../core/types/statistics';

interface SessionGraphProps {
  sessions: SessionStatisticsWithMaps[];
  dataKey: keyof SessionStatisticsWithMaps;
  yLabel: string;
  yDomain: [number, number];
  timeWindow: 7 | 30;
}

interface DataPoint {
  x: number;  // Days ago
  y: number;  // Metric value
  date: Date;
  sessionId: string;
}

export default function SessionGraph({ sessions, dataKey, yLabel, yDomain, timeWindow }: SessionGraphProps) {

  // Process sessions into data points
  const dataPoints = useMemo(() => {
    const now = new Date();
    const points: DataPoint[] = [];

    sessions.forEach((session, index) => {
      // Skip sessions without timestamp
      if (!session.timestamp) return;

      // Calculate days ago using the timestamp field (actual Unix timestamp)
      const sessionDate = new Date(session.timestamp);
      const daysAgo = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);

      // Filter based on time window
      if (daysAgo > timeWindow) return;

      // Get the metric value
      const value = session[dataKey];
      if (typeof value === 'number') {
        points.push({
          x: timeWindow - daysAgo,  // Convert to "days from start" for display
          y: Math.round(value * 10) / 10,  // Round to 1 decimal
          date: sessionDate,
          sessionId: `${session.timestamp}-${index}`
        });
      }
    });

    // Sort by date
    return points.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [sessions, dataKey, timeWindow]);

  // Custom X-axis formatter
  const formatXAxisLabel = (value: number) => {
    if (timeWindow === 7) {
      if (value === 1) return '7d ago';
      if (value === 3.5) return '3d ago';
      if (value === 7) return 'Today';
      return '';
    } else {
      if (value === 1) return '30 days ago';
      if (value === 8) return '23 days ago';
      if (value === 15) return '15 days ago';
      if (value === 22) return '8 days ago';
      if (value === 30) return 'Today';
      return '';
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DataPoint }> }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      const daysAgo = Math.floor(timeWindow - point.x);
      const dateStr = point.date.toLocaleDateString();
      const timeStr = point.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Get the session for additional info
      const session = sessions.find(s => s.timestamp && `${s.timestamp}-${sessions.indexOf(s)}` === point.sessionId);
      const durationMinutes = session ? Math.round(session.durationMs / 60000) : 0;
      const accuracy = session ? Math.round(session.overallAccuracy) : 0;
      const sourceName = session?.config.sourceName || session?.config.sourceId || 'Unknown';

      return (
        <div className="graph-tooltip">
          <p className="tooltip-date">{dateStr} at {timeStr}</p>
          <p className="tooltip-value">{point.y} {yLabel}</p>
          <div className="tooltip-details">
            <p className="tooltip-detail">Source: {sourceName}</p>
            <p className="tooltip-detail">Duration: {durationMinutes} min</p>
            <p className="tooltip-detail">Accuracy: {accuracy}%</p>
          </div>
          <p className="tooltip-ago">{daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`}</p>
        </div>
      );
    }
    return null;
  };

  if (dataPoints.length === 0) {
    return (
      <div className="session-graph-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-muted">
          <path d="M3 3l18 18M21 3L3 21" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="body-regular text-muted">No session data available</p>
      </div>
    );
  }

  return (
    <div className="session-graph-container">

      <ResponsiveContainer width="100%" height={250}>
        <ScatterChart
          margin={{ top: 15, right: 20, left: 15, bottom: 30 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-primary)"
            opacity={0.3}
          />
          <XAxis
            type="number"
            dataKey="x"
            domain={[1, timeWindow]}
            ticks={timeWindow === 7 ? [1, 3.5, 7] : [1, 8, 15, 22, 30]}
            tickFormatter={formatXAxisLabel}
            stroke="var(--text-muted)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={yDomain}
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'var(--text-muted)', fontSize: '12px' }
            }}
            stroke="var(--text-muted)"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: '3 3', stroke: 'var(--text-muted)', opacity: 0.5 }}
          />
          <Scatter
            data={dataPoints}
            fill="var(--color-blue-primary)"
          >
            {dataPoints.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill="var(--color-blue-primary)"
                stroke="transparent"
                strokeWidth={0}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="graph-summary">
        <p className="body-small text-muted">
          {dataPoints.length} session{dataPoints.length === 1 ? '' : 's'} • Last {timeWindow} days
        </p>
      </div>
    </div>
  );
}
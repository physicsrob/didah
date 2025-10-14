import { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { StatisticsAPI } from '../../features/statistics/api';
import type { SessionStatisticsWithMaps } from '../../core/types/statistics';

interface HistoryTabProps {
  timeWindow: 7 | 30;
}

export default function HistoryTab({ timeWindow }: HistoryTabProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [sessions, setSessions] = useState<SessionStatisticsWithMaps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        setError(null);

        // Get auth token from Clerk
        const token = user ? await getToken() : null;

        // Create API client
        const statsAPI = new StatisticsAPI(token);

        // Fetch all sessions (not filtered by mode)
        const allSessions = await statsAPI.getSessions();

        setSessions(allSessions);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError('Failed to load session history');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [user, getToken]);

  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const cutoffTime = now - (timeWindow * 24 * 60 * 60 * 1000);
    return sessions.filter(s => s.timestamp && s.timestamp >= cutoffTime);
  }, [sessions, timeWindow]);

  // Format mode display name
  const formatMode = (mode: string): string => {
    switch (mode) {
      case 'practice':
        return 'Practice';
      case 'listen':
        return 'Listen';
      case 'live-copy':
        return 'Live Copy';
      default:
        return mode;
    }
  };

  // Format duration from milliseconds to minutes
  const formatDuration = (ms: number): string => {
    const minutes = Math.round(ms / 1000 / 60 * 10) / 10; // Round to 1 decimal
    return `${minutes} min`;
  };

  // Format relative date
  const formatRelativeDate = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return days === 1 ? 'Yesterday' : `${days} days ago`;
    } else if (hours > 0) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (minutes > 0) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="heading-2">Session History</h2>
        <p className="body-small text-muted">Last {timeWindow} days</p>
      </div>

      {loading && (
        <div className="card p-8 text-center">
          <div className="text-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 animate-spin">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
            </svg>
            <p className="body-regular">Loading session history...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="card p-8 text-center">
          <div className="text-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="body-regular">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && filteredSessions.length > 0 && (
        <div className="card p-4">
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Duration</th>
                  <th>Text Source</th>
                  <th>Effective WPM</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session, index) => (
                  <tr key={`${session.timestamp || session.startedAt}-${index}`}>
                    <td className="date-cell">
                      {session.timestamp ? formatRelativeDate(session.timestamp) : '-'}
                    </td>
                    <td>
                      <span className={`mode-badge mode-${session.config.mode}`}>
                        {formatMode(session.config.mode)}
                      </span>
                    </td>
                    <td>{formatDuration(session.durationMs)}</td>
                    <td className="source-cell">
                      {session.config.sourceName || session.config.sourceId || 'Unknown'}
                    </td>
                    <td className="wpm-cell">
                      {session.config.mode === 'listen' ? '-' : session.achievedWpm.toFixed(1)}
                    </td>
                    <td className="accuracy-cell">
                      {session.config.mode === 'listen' ? (
                        <span className="text-muted">-</span>
                      ) : (
                        <span className={`accuracy-value ${session.overallAccuracy >= 90 ? 'accuracy-high' : session.overallAccuracy >= 75 ? 'accuracy-medium' : 'accuracy-low'}`}>
                          {session.overallAccuracy.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && filteredSessions.length === 0 && !user && (
        <div className="card p-6 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-muted">
            <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="body-regular text-muted">
            Sign in to track your session history
          </p>
        </div>
      )}

      {!loading && !error && filteredSessions.length === 0 && user && (
        <div className="card p-8 text-center">
          <div className="text-muted">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4">
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
      )}
    </div>
  );
}
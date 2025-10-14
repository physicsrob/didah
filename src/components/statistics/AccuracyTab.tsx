import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { StatisticsAPI } from '../../features/statistics/api';
import type { SessionStatisticsWithMaps } from '../../core/types/statistics';
import SessionGraph from './SessionGraph';

interface AccuracyTabProps {
  timeWindow: 7 | 30;
}

export default function AccuracyTab({ timeWindow }: AccuracyTabProps) {
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

        // Fetch all sessions
        const allSessions = await statsAPI.getSessions();

        // Filter to performance modes (exclude listen which has no user input)
        const performanceSessions = allSessions.filter(
          session => session.config?.mode !== 'listen'
        );

        setSessions(performanceSessions);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError('Failed to load session data');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [user, getToken]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="heading-2">Accuracy</h2>
        <p className="body-small text-muted">Your accuracy progression over the last {timeWindow} days</p>
      </div>

      {loading && (
        <div className="card p-8 text-center">
          <div className="text-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 animate-spin">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
            </svg>
            <p className="body-regular">Loading session data...</p>
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

      {!loading && !error && sessions.length > 0 && (
        <div className="card p-6">
          <SessionGraph
            sessions={sessions}
            dataKey="overallAccuracy"
            yLabel="Accuracy %"
            yDomain={[0, 100]}
            timeWindow={timeWindow}
          />
        </div>
      )}

      {!loading && !error && sessions.length === 0 && !user && (
        <div className="card p-6 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-muted">
            <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="body-regular text-muted">
            Sign in to track your accuracy progression
          </p>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && user && (
        <div className="card p-8 text-center">
          <div className="text-muted">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
            </svg>
            <h3 className="heading-3 mb-2">No Sessions Yet</h3>
            <p className="body-regular text-muted">
              Complete sessions to see your accuracy progression
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
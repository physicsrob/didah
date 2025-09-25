import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { StatisticsAPI } from '../../features/statistics/api';
import type { SessionStatistics } from '../../core/types/statistics';
import { getMorsePattern } from '../../core/morse/alphabet';

interface CharacterConfusion {
  character: string;
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  confusedWith: Array<{
    character: string;
    count: number;
    percentage: number;
  }>;
}

export default function ConfusionTab() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<7 | 30>(30);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        setError(null);

        const token = user ? localStorage.getItem('google_token') : null;
        const statsAPI = new StatisticsAPI(token);
        const allSessions = await statsAPI.getSessions();

        // Filter to practice mode only (where we have confusion data)
        const practiceSessions = allSessions.filter(
          session => session.config?.mode === 'practice'
        );

        setSessions(practiceSessions);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError('Failed to load confusion data');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [user]);

  // Aggregate confusion data from all sessions within time window
  const confusionData = useMemo(() => {
    const now = Date.now();
    const cutoffTime = now - (timeWindow * 24 * 60 * 60 * 1000);

    // Filter sessions by time window
    const recentSessions = sessions.filter(session => {
      return session.timestamp && session.timestamp >= cutoffTime;
    });

    // Aggregate character stats across all sessions
    const aggregateStats = new Map<string, {
      attempts: number;
      correct: number;
      incorrect: number;
      confusions: Map<string, number>;
    }>();

    for (const session of recentSessions) {
      // Process character stats
      if (session.characterStats instanceof Map) {
        for (const [char, stats] of session.characterStats) {
          if (!aggregateStats.has(char)) {
            aggregateStats.set(char, {
              attempts: 0,
              correct: 0,
              incorrect: 0,
              confusions: new Map()
            });
          }

          const agg = aggregateStats.get(char)!;
          agg.attempts += stats.attempts;
          agg.correct += stats.correct;
          agg.incorrect += stats.incorrect;
        }
      }

      // Process confusion matrix
      if (session.confusionMatrix instanceof Map) {
        for (const [expected, confusionsMap] of session.confusionMatrix) {
          const agg = aggregateStats.get(expected);
          if (agg) {
            if (confusionsMap instanceof Map) {
              for (const [confusedWith, count] of confusionsMap) {
                agg.confusions.set(confusedWith,
                  (agg.confusions.get(confusedWith) || 0) + count
                );
              }
            }
          }
        }
      }
    }

    // Convert to CharacterConfusion array
    const confusions: CharacterConfusion[] = [];

    for (const [character, stats] of aggregateStats) {
      const accuracy = stats.attempts > 0
        ? (stats.correct / stats.attempts) * 100
        : 100;

      // Process confusions for this character
      const confusedWith: CharacterConfusion['confusedWith'] = [];
      const totalErrors = stats.incorrect;

      if (totalErrors > 0) {
        for (const [confChar, count] of stats.confusions) {
          const percentage = (count / totalErrors) * 100;
          // Only include confusions > 10%
          if (percentage > 10) {
            confusedWith.push({
              character: confChar,
              count,
              percentage: Math.round(percentage)
            });
          }
        }

        // Sort by percentage descending
        confusedWith.sort((a, b) => b.percentage - a.percentage);
      }

      confusions.push({
        character,
        totalAttempts: stats.attempts,
        correctCount: stats.correct,
        incorrectCount: stats.incorrect,
        accuracy,
        confusedWith
      });
    }

    // Sort by accuracy ascending (worst first) and take top 10
    confusions.sort((a, b) => a.accuracy - b.accuracy);
    return confusions.slice(0, 10);
  }, [sessions, timeWindow]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="heading-2">Character Confusion</h2>
          <p className="body-small text-muted">Your most frequently confused characters</p>
        </div>
        <div className="card p-8 text-center">
          <div className="text-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 animate-spin">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
            </svg>
            <p className="body-regular">Loading confusion data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="heading-2">Character Confusion</h2>
          <p className="body-small text-muted">Your most frequently confused characters</p>
        </div>
        <div className="card p-8 text-center">
          <div className="text-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="body-regular">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="heading-2">Character Confusion</h2>
          <p className="body-small text-muted">Your most frequently confused characters</p>
        </div>
        <div className="card p-6 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-muted">
            <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="body-regular text-muted">
            Sign in to track your character confusion patterns
          </p>
        </div>
      </div>
    );
  }

  if (confusionData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="heading-2">Character Confusion</h2>
          <p className="body-small text-muted">Your most frequently confused characters</p>
        </div>
        <div className="graph-controls">
          <button
            className={`time-toggle ${timeWindow === 7 ? 'active' : ''}`}
            onClick={() => setTimeWindow(7)}
          >
            Last 7 Days
          </button>
          <button
            className={`time-toggle ${timeWindow === 30 ? 'active' : ''}`}
            onClick={() => setTimeWindow(30)}
          >
            Last 30 Days
          </button>
        </div>
        <div className="card p-8 text-center">
          <div className="text-muted">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
            </svg>
            <h3 className="heading-3 mb-2">No Confusion Data</h3>
            <p className="body-regular text-muted">
              Complete practice sessions to see your confusion patterns
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="heading-2">Character Confusion</h2>
        <p className="body-small text-muted">Your most frequently confused characters</p>
      </div>

      <div className="graph-controls">
        <button
          className={`time-toggle ${timeWindow === 7 ? 'active' : ''}`}
          onClick={() => setTimeWindow(7)}
        >
          Last 7 Days
        </button>
        <button
          className={`time-toggle ${timeWindow === 30 ? 'active' : ''}`}
          onClick={() => setTimeWindow(30)}
        >
          Last 30 Days
        </button>
      </div>

      <div className="card p-4">
        <div className="confusion-table-container">
          <table className="confusion-table">
            <thead>
              <tr>
                <th>Character</th>
                <th>Pattern</th>
                <th>Accuracy</th>
                <th>Confused With</th>
              </tr>
            </thead>
            <tbody>
              {confusionData.map(item => {
                const pattern = getMorsePattern(item.character) || '';
                return (
                  <tr key={item.character}>
                    <td className="char-cell">
                      <span className="char-display">{item.character}</span>
                    </td>
                    <td className="pattern-cell">
                      <span className="morse-pattern">{pattern}</span>
                    </td>
                    <td className="accuracy-cell">
                      <span className={`accuracy-value ${
                        item.accuracy >= 90 ? 'accuracy-high' :
                        item.accuracy >= 75 ? 'accuracy-medium' :
                        'accuracy-low'
                      }`}>
                        {item.accuracy.toFixed(1)}%
                      </span>
                      <span className="attempt-count">
                        ({item.totalAttempts} attempts)
                      </span>
                    </td>
                    <td className="confused-cell">
                      {item.confusedWith.length === 0 ? (
                        <span className="no-confusion">Various</span>
                      ) : (
                        <div className="confusion-badges">
                          {item.confusedWith.map(conf => (
                            <span key={conf.character} className="confusion-badge">
                              <span className="confusion-char">{conf.character}</span>
                              <span className="confusion-percent">({conf.percentage}%)</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="confusion-summary">
          <p className="body-small text-muted">
            Showing top {confusionData.length} confused characters from the last {timeWindow} days
          </p>
        </div>
      </div>
    </div>
  );
}
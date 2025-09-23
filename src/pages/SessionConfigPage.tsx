import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { SessionConfig } from '../core/types/domain';
import { getActiveWindowMs, getPassiveTimingMultipliers } from '../core/morse/timing';
import { fetchSources, fetchSourceContent } from '../features/sources';
import type { TextSource as ApiTextSource, SourceContent } from '../features/sources';
import '../styles/main.css';

type SpeedTier = 'slow' | 'medium' | 'fast' | 'lightning';
type SessionMode = 'practice' | 'listen' | 'live-copy';
type FeedbackType = 'buzzer' | 'flash' | 'both' | 'none';

export function SessionConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get mode from navigation state (set by HomePage)
  const mode: SessionMode = (location.state as any)?.mode || 'practice';

  // Mode-specific configuration
  const modeConfig = {
    'practice': {
      title: 'Practice Mode',
      description: 'Interactive training where you type what you hear in real-time, but you do have some control of the pacing. Try to go as fast as possible!'
    },
    'listen': {
      title: 'Listen Mode',
      description: 'Passive listening where characters are revealed after playing. Perfect for learning new characters without pressure.'
    },
    'live-copy': {
      title: 'Live Copy Mode',
      description: 'Real-time continuous copying like actual CW. Characters stream at a constant rate - keep up or fall behind!'
    }
  };

  // Session configuration state - load from localStorage
  const [duration, setDuration] = useState<1 | 2 | 5>(() => {
    const saved = localStorage.getItem('duration');
    return saved ? (Number(saved) as 1 | 2 | 5) : 1;
  });
  const [speedTier, setSpeedTier] = useState<SpeedTier>(() => {
    const saved = localStorage.getItem('speedTier');
    return (saved as SpeedTier) || 'slow';
  });
  const [selectedSourceId, setSelectedSourceId] = useState<string>(() => {
    return localStorage.getItem('selectedSourceId') || 'random_letters';
  });
  const [wpm, setWpm] = useState(() => {
    const saved = localStorage.getItem('wpm');
    return saved ? Number(saved) : 15;
  });

  // Text source state
  const [availableSources, setAvailableSources] = useState<ApiTextSource[]>([]);
  const [sourceContent, setSourceContent] = useState<SourceContent | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  // Load settings from localStorage
  const [feedback, setFeedback] = useState<FeedbackType>(() =>
    (localStorage.getItem('feedback') as FeedbackType) || 'both'
  );
  const [replay, setReplay] = useState(() => localStorage.getItem('replay') !== 'false');

  // Feedback mode state for UI
  const [feedbackMode, setFeedbackMode] = useState<'flash' | 'buzzer' | 'replay' | 'off'>(() => {
    if (feedback === 'none') return 'off';
    if (replay) return 'replay';
    if (feedback === 'flash') return 'flash';
    if (feedback === 'buzzer') return 'buzzer';
    return 'flash'; // default
  });
  const [includeNumbers, setIncludeNumbers] = useState(() => localStorage.getItem('includeNumbers') !== 'false');
  const [includeStdPunct, setIncludeStdPunct] = useState(() => localStorage.getItem('includeStdPunct') !== 'false');
  const [includeAdvPunct, setIncludeAdvPunct] = useState(() => localStorage.getItem('includeAdvPunct') === 'true');

  // Live Copy specific settings
  const [liveCopyFeedback, setLiveCopyFeedback] = useState<'end' | 'immediate'>(() => {
    const saved = localStorage.getItem('liveCopyFeedback');
    return (saved as 'end' | 'immediate') || 'end';
  });

  // Fetch available sources on mount
  useEffect(() => {
    setSourcesLoading(true);
    fetchSources()
      .then(sources => {
        setAvailableSources(sources);
        // Pre-fetch content for default source
        if (selectedSourceId) {
          return fetchSourceContent(selectedSourceId);
        }
      })
      .then(content => {
        if (content) {
          setSourceContent(content);
        }
      })
      .catch(error => {
        console.error('Failed to fetch sources:', error);
        // Fallback to local source
        setAvailableSources([{ id: 'random_letters', name: 'Random Letters', type: 'generated' }]);
      })
      .finally(() => {
        setSourcesLoading(false);
      });
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('duration', duration.toString());
  }, [duration]);

  useEffect(() => {
    localStorage.setItem('speedTier', speedTier);
  }, [speedTier]);

  useEffect(() => {
    localStorage.setItem('selectedSourceId', selectedSourceId);
  }, [selectedSourceId]);

  useEffect(() => {
    localStorage.setItem('wpm', wpm.toString());
  }, [wpm]);

  useEffect(() => {
    localStorage.setItem('feedback', feedback);
  }, [feedback]);

  useEffect(() => {
    localStorage.setItem('replay', replay.toString());
  }, [replay]);

  useEffect(() => {
    localStorage.setItem('liveCopyFeedback', liveCopyFeedback);
  }, [liveCopyFeedback]);

  useEffect(() => {
    localStorage.setItem('includeNumbers', includeNumbers.toString());
  }, [includeNumbers]);

  useEffect(() => {
    localStorage.setItem('includeStdPunct', includeStdPunct.toString());
  }, [includeStdPunct]);

  useEffect(() => {
    localStorage.setItem('includeAdvPunct', includeAdvPunct.toString());
  }, [includeAdvPunct]);

  // Handle source selection
  const handleSourceChange = async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setLoadingSource(true);
    try {
      const content = await fetchSourceContent(sourceId);
      setSourceContent(content);
    } catch (error) {
      console.error(`Failed to fetch source ${sourceId}:`, error);
      setSourceContent(null); // Will fallback to local random
    } finally {
      setLoadingSource(false);
    }
  };

  // Build effective alphabet based on toggles
  const buildAlphabet = () => {
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) alphabet += '0123456789';
    if (includeStdPunct) alphabet += '.,?/=';
    if (includeAdvPunct) alphabet += ':;!@#$%^&*()+-_[]{}|\\<>\'"`~';
    return alphabet.split('');
  };

  const handleStartSession = () => {
    const config: SessionConfig = {
      mode,
      lengthMs: duration * 60 * 1000,
      wpm,
      speedTier,
      sourceId: selectedSourceId,
      feedback,
      replay,
      effectiveAlphabet: buildAlphabet(),
      ...(mode === 'live-copy' && { liveCopyFeedback }),
    };

    // Find the source name from availableSources
    const sourceName = availableSources.find(s => s.id === selectedSourceId)?.name || 'Unknown';

    // Navigate to session with config, pre-fetched content, and source name
    navigate('/session', { state: { config, sourceContent, sourceName } });
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header with Back button and MorseAcademy branding */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '20px 24px',
        marginBottom: '32px'
      }}>
        <button
          onClick={handleCancel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>←</span>
          Back
        </button>
        <h1
          className="brand-title"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          MorseAcademy
        </h1>
      </header>

      <div className="container" style={{ margin: '0 auto', padding: '0 16px' }}>
        {/* Main Settings Card */}
        <div className="card mb-4" style={{
          maxWidth: '672px',
          margin: '0 auto',
          background: 'rgba(26, 26, 26, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '32px'
        }}>
          {/* Mode Title and Description */}
          <div style={{ marginBottom: '40px' }}>
            <h1 className="heading-1" style={{
              color: '#ffffff',
              fontSize: '32px',
              marginBottom: '12px'
            }}>
              {modeConfig[mode].title}
            </h1>
            <p className="body-regular" style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              {modeConfig[mode].description}
            </p>
          </div>

          {/* Text Source */}
          <div className="settings-row">
            <div className="settings-label">Text Source</div>
            <div className="settings-control">
              <select
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: '15px',
                  background: 'rgba(42, 42, 42, 0.8)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                value={selectedSourceId}
                onChange={(e) => handleSourceChange(e.target.value)}
                disabled={sourcesLoading || loadingSource}
              >
                {sourcesLoading ? (
                  <option>Loading sources...</option>
                ) : (
                  availableSources.map(source => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div className="settings-row">
            <div className="settings-label">Duration</div>
            <div className="settings-control">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as 1 | 2 | 5)}
                style={{
                  flex: 1,
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '2px',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <span style={{
                color: '#4dabf7',
                fontSize: '16px',
                fontWeight: '500',
                minWidth: '60px',
                textAlign: 'right'
              }}>
                {duration} min
              </span>
            </div>
          </div>

          {/* Character Speed */}
          <div className="settings-row">
            <div className="settings-label">Character Speed</div>
            <div className="settings-control">
              <input
                type="range"
                min="5"
                max="40"
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                style={{
                  flex: 1,
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '2px',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <span style={{
                color: '#4dabf7',
                fontSize: '16px',
                fontWeight: '500',
                minWidth: '80px',
                textAlign: 'right'
              }}>
                {wpm} WPM
              </span>
            </div>
          </div>

          {/* Live Copy Feedback Mode */}
          {mode === 'live-copy' && (
            <div className="form-group mb-4">
              <label className="form-label">Feedback Mode</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={`btn ${liveCopyFeedback === 'end' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setLiveCopyFeedback('end')}
                >
                  End of Session
                </button>
                <button
                  type="button"
                  className={`btn ${liveCopyFeedback === 'immediate' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setLiveCopyFeedback('immediate')}
                >
                  Live Corrections
                </button>
              </div>
              <p className="body-small text-muted mt-2">
                {liveCopyFeedback === 'end'
                  ? 'Grade your copy at the end of the session'
                  : 'See corrections in red as you type'}
              </p>
            </div>
          )}

          {/* Feedback - Only show for practice mode */}
          {mode === 'practice' && (
            <div className="settings-row">
              <div className="settings-label">Feedback</div>
              <div className="settings-control">
                <div className="segmented-control">
                  <button
                    className={`segmented-btn ${feedbackMode === 'flash' ? 'active' : ''}`}
                    onClick={() => {
                      setFeedbackMode('flash');
                      setFeedback('flash');
                      setReplay(false);
                    }}
                  >
                    Flash
                  </button>
                  <button
                    className={`segmented-btn ${feedbackMode === 'buzzer' ? 'active' : ''}`}
                    onClick={() => {
                      setFeedbackMode('buzzer');
                      setFeedback('buzzer');
                      setReplay(false);
                    }}
                  >
                    Buzzer
                  </button>
                  <button
                    className={`segmented-btn ${feedbackMode === 'replay' ? 'active' : ''}`}
                    onClick={() => {
                      setFeedbackMode('replay');
                      setFeedback('both');
                      setReplay(true);
                    }}
                  >
                    Replay
                  </button>
                  <button
                    className={`segmented-btn ${feedbackMode === 'off' ? 'active' : ''}`}
                    onClick={() => {
                      setFeedbackMode('off');
                      setFeedback('none');
                      setReplay(false);
                    }}
                  >
                    Off
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeout Speed - Only show for practice and live-copy modes */}
          {mode !== 'listen' && (
            <div className="settings-row">
              <div className="settings-label">Timeout Speed</div>
              <div className="settings-control">
                <div className="segmented-control">
                  <button
                    className={`segmented-btn ${speedTier === 'slow' ? 'active' : ''}`}
                    onClick={() => setSpeedTier('slow')}
                  >
                    Slow
                  </button>
                  <button
                    className={`segmented-btn ${speedTier === 'medium' ? 'active' : ''}`}
                    onClick={() => setSpeedTier('medium')}
                  >
                    Medium
                  </button>
                  <button
                    className={`segmented-btn ${speedTier === 'fast' ? 'active' : ''}`}
                    onClick={() => setSpeedTier('fast')}
                  >
                    Fast
                  </button>
                  <button
                    className={`segmented-btn ${speedTier === 'lightning' ? 'active' : ''}`}
                    onClick={() => setSpeedTier('lightning')}
                  >
                    Lightning
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Start Button */}
        <div className="flex justify-center" style={{ marginTop: '48px' }}>
          <button
            onClick={handleStartSession}
            style={{
              background: '#4dabf7',
              color: '#1a1a1a',
              fontSize: '20px',
              fontWeight: '600',
              padding: '16px 64px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '300px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#74bbf8';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4dabf7';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Start {modeConfig[mode].title.replace(' Mode', '')}
          </button>
        </div>
      </div>
    </div>
  );
}
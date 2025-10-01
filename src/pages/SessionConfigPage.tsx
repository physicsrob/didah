import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { SessionConfig, SessionMode, SpeedTier } from '../core/types/domain';
import type { FeedbackMode } from '../features/settings/store/types';
import { fetchSources, fetchSourceContent } from '../features/sources';
import type { TextSource as ApiTextSource, SourceContent } from '../features/sources';
import { useSettings } from '../features/settings/hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { HeaderBar } from '../components/HeaderBar';
import '../styles/main.css';

export function SessionConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get mode from navigation state (set by HomePage)
  const mode: SessionMode = (location.state as { mode?: SessionMode })?.mode || 'practice';

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

  // Use centralized settings
  const { settings, updateSetting, isLoading: settingsLoading } = useSettings();
  const { user } = useAuth();

  // Session configuration state - default values before settings load
  const [duration, setDuration] = useState<1 | 2 | 5>(1);
  const [speedTier, setSpeedTier] = useState<SpeedTier>('slow');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('random_letters');
  const [wpm, setWpm] = useState(15);
  const [effectiveWpm, setEffectiveWpm] = useState(10);
  const [extraWordSpacing, setExtraWordSpacing] = useState(0);

  // Text source state
  const [availableSources, setAvailableSources] = useState<ApiTextSource[]>([]);
  const [sourceContent, setSourceContent] = useState<SourceContent | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourceLoadError, setSourceLoadError] = useState<string | null>(null);

  // Single source of truth for feedback configuration
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('flash');

  // Helper to derive feedback and replay from feedbackMode
  const getFeedbackConfig = (): { feedback: 'buzzer' | 'flash' | 'both' | 'none', replay: boolean } => {
    switch (feedbackMode) {
      case 'off':
        return { feedback: 'none', replay: false };
      case 'flash':
        return { feedback: 'flash', replay: false };
      case 'buzzer':
        return { feedback: 'buzzer', replay: false };
      case 'replay':
        return { feedback: 'both', replay: true };  // 'both' means flash + buzzer, plus replay=true
      default:
        return { feedback: 'flash', replay: false };
    }
  };
  // Character options from settings
  const includeNumbers = settings?.includeNumbers ?? true;
  const includeStdPunct = settings?.includeStdPunct ?? true;
  const includeAdvPunct = settings?.includeAdvPunct ?? false;

  // Load settings into local state when they become available
  useEffect(() => {
    if (settings && !settingsLoading) {
      // Convert settings duration (60/120/300) to minutes (1/2/5)
      setDuration((settings.defaultDuration / 60) as 1 | 2 | 5);
      setSpeedTier(settings.defaultSpeedTier);
      setSelectedSourceId(settings.defaultSourceId);
      setWpm(settings.wpm);
      setEffectiveWpm(settings.effectiveWpm);
      setExtraWordSpacing(settings.extraWordSpacing);

      // Direct assignment - feedbackMode is stored as-is now
      setFeedbackMode(settings.feedbackMode);
    }
  }, [settings, settingsLoading]);

  // Fetch available sources on mount
  useEffect(() => {
    setSourcesLoading(true);
    fetchSources()
      .then(sources => {
        const filteredSources = sources.filter(source => {
          if (source.requiresAuth && !user) {
            return false;
          }
          return true;
        });
        setAvailableSources(filteredSources);
      })
      .catch(error => {
        console.error('Failed to fetch sources:', error);
        // Fallback to local source
        setAvailableSources([{ id: 'random_letters', name: 'Random Letters', type: 'generated', backendId: 'random_letters' }]);
      })
      .finally(() => {
        setSourcesLoading(false);
      });
  }, [user]);

  // Fetch content when selectedSourceId changes or on mount
  useEffect(() => {
    if (!selectedSourceId) return;

    setSourceLoadError(null); // Clear any previous errors

    // Random letters is always available locally
    if (selectedSourceId === 'random_letters') {
      setSourceContent(null); // null means use local random generator
      return;
    }

    // Find the source object to get its backendId
    const source = availableSources.find(s => s.id === selectedSourceId);
    if (!source) {
      console.error(`Source not found: ${selectedSourceId}`);
      return;
    }

    // Always fetch fresh content (even on mount/reload)
    fetchSourceContent(source.backendId, source.requiresAuth ?? false)
      .then(content => {
        if (content) {
          // Override the content ID with the frontend ID for proper source factory detection
          setSourceContent({ ...content, id: selectedSourceId });
        } else {
          setSourceLoadError(`Failed to load "${source.name}". Please try again or select a different source.`);
          setSourceContent(null);
        }
      })
      .catch(error => {
        console.error(`Failed to fetch source ${source.backendId}:`, error);
        setSourceLoadError(`Failed to load "${source.name}". Please try again or select a different source.`);
        setSourceContent(null);
      });
  }, [selectedSourceId, availableSources]);

  // Save settings to centralized store when they change
  useEffect(() => {
    if (!settings || settingsLoading) return;

    // Create a debounce timer to batch updates
    const timer = setTimeout(() => {
      const durationInSeconds = (duration * 60) as 60 | 120 | 300;

      // Check what needs updating
      const needsUpdate =
        settings.defaultDuration !== durationInSeconds ||
        settings.defaultSpeedTier !== speedTier ||
        settings.defaultSourceId !== selectedSourceId ||
        settings.wpm !== wpm ||
        settings.effectiveWpm !== effectiveWpm ||
        settings.extraWordSpacing !== extraWordSpacing ||
        settings.feedbackMode !== feedbackMode;

      if (needsUpdate) {
        // Update all settings at once
        if (settings.defaultDuration !== durationInSeconds) {
          updateSetting('defaultDuration', durationInSeconds);
        }
        if (settings.defaultSpeedTier !== speedTier) {
          updateSetting('defaultSpeedTier', speedTier);
        }
        if (settings.defaultSourceId !== selectedSourceId) {
          updateSetting('defaultSourceId', selectedSourceId);
        }
        if (settings.wpm !== wpm) {
          updateSetting('wpm', wpm);
        }
        if (settings.effectiveWpm !== effectiveWpm) {
          updateSetting('effectiveWpm', effectiveWpm);
        }
        if (settings.extraWordSpacing !== extraWordSpacing) {
          updateSetting('extraWordSpacing', extraWordSpacing);
        }
        if (settings.feedbackMode !== feedbackMode) {
          updateSetting('feedbackMode', feedbackMode);
        }
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [duration, speedTier, selectedSourceId, wpm, effectiveWpm, extraWordSpacing, feedbackMode, settings, settingsLoading, updateSetting]);

  // Handle source selection
  const handleSourceChange = async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setSourceLoadError(null); // Clear any previous errors

    // Random letters is always available locally
    if (sourceId === 'random_letters') {
      setSourceContent(null); // null means use local random generator
      return;
    }

    // Find the source object to get its backendId
    const source = availableSources.find(s => s.id === sourceId);
    if (!source) {
      console.error(`Source not found: ${sourceId}`);
      return;
    }

    try {
      const content = await fetchSourceContent(source.backendId, source.requiresAuth ?? false);
      if (content) {
        // Override the content ID with the frontend ID for proper source factory detection
        setSourceContent({ ...content, id: sourceId });
      } else {
        // fetchSourceContent returns null on error
        setSourceLoadError(`Failed to load "${source.name}". Please try again or select a different source.`);
        setSourceContent(null);
      }
    } catch (error) {
      console.error(`Failed to fetch source ${source.backendId}:`, error);
      setSourceLoadError(`Failed to load "${source.name}". Please try again or select a different source.`);
      setSourceContent(null);
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

  const handleStartSession = async () => {
    // Don't start if there's a source loading error (unless using random_letters)
    if (sourceLoadError && selectedSourceId !== 'random_letters') {
      console.warn('Cannot start session: source loading error');
      return;
    }

    const { feedback, replay } = getFeedbackConfig();

    // Find the source name from availableSources
    const sourceName = availableSources.find(s => s.id === selectedSourceId)?.name || 'Unknown';

    const config: SessionConfig = {
      mode,
      lengthMs: duration * 60 * 1000,
      wpm,
      effectiveWpm,
      speedTier,
      sourceId: selectedSourceId,
      sourceName,
      feedback,
      replay,
      effectiveAlphabet: buildAlphabet(),
      extraWordSpacing,
    };

    // Fetch fresh content for each new session (except random_letters which is generated locally)
    let freshContent = null;
    if (selectedSourceId !== 'random_letters') {
      const source = availableSources.find(s => s.id === selectedSourceId);
      if (source) {
        try {
          const content = await fetchSourceContent(source.backendId, source.requiresAuth ?? false);
          // Override the content ID with the frontend ID for proper source factory detection
          freshContent = content ? { ...content, id: selectedSourceId } : null;
        } catch (error) {
          console.error('Failed to fetch fresh content, using cached:', error);
          freshContent = sourceContent; // Fall back to cached content if fetch fails
        }
      }
    }

    // Navigate to session with config and fresh content
    navigate('/session', { state: { config, sourceContent: freshContent } });
  };


  // Show loading state while settings are loading
  if (settingsLoading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="heading-2">Loading settings...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeaderBar pageTitle={modeConfig[mode].title} />

      <div className="container" style={{ margin: '0 auto', padding: '0 16px' }}>
        {/* Main Settings Card */}
        <div className="card mb-4" style={{
          maxWidth: '672px',
          margin: '0 auto',
          padding: '32px'
        }}>
          {/* Mode Description */}
          <div style={{ marginBottom: '40px' }}>
            <p className="body-regular" style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              <span style={{ fontWeight: '600' }}>{modeConfig[mode].title}:</span> {modeConfig[mode].description}
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
                  background: 'var(--background-tertiary)',
                  color: '#ffffff',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                value={selectedSourceId}
                onChange={(e) => handleSourceChange(e.target.value)}
                disabled={sourcesLoading}
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

          {/* Error message for source loading */}
          {sourceLoadError && (
            <div style={{
              marginTop: '12px',
              marginBottom: '12px',
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#ef4444',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span style={{ flex: 1 }}>{sourceLoadError}</span>
              <button
                onClick={() => handleSourceChange(selectedSourceId)}
                style={{
                  padding: '4px 12px',
                  fontSize: '13px',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
              >
                Retry
              </button>
            </div>
          )}

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
                onChange={(e) => {
                  const newWpm = Number(e.target.value);
                  setWpm(newWpm);
                  // If effective WPM is greater than character WPM, cap it
                  if (effectiveWpm > newWpm) {
                    setEffectiveWpm(newWpm);
                  }
                }}
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

          {/* Effective Speed - Only show for listen and live-copy modes */}
          {(mode === 'listen' || mode === 'live-copy') && (
            <div className="settings-row">
              <div className="settings-label">Effective Speed</div>
              <div className="settings-control">
                <input
                  type="range"
                  min="5"
                  max={wpm} // Cannot exceed character speed
                  value={effectiveWpm}
                  onChange={(e) => setEffectiveWpm(Number(e.target.value))}
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
                  {effectiveWpm} WPM{effectiveWpm === wpm ? ' (std)' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Extra Word Spacing - Only show for listen and live-copy modes */}
          {(mode === 'listen' || mode === 'live-copy') && (
            <div className="settings-row">
              <div className="settings-label">Extra Word Spacing</div>
              <div className="settings-control">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={extraWordSpacing}
                  onChange={(e) => setExtraWordSpacing(Number(e.target.value))}
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
                  {extraWordSpacing === 0 ? 'None' : `+${extraWordSpacing}`}
                </span>
              </div>
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
                    onClick={() => setFeedbackMode('flash')}
                  >
                    Flash
                  </button>
                  <button
                    className={`segmented-btn ${feedbackMode === 'buzzer' ? 'active' : ''}`}
                    onClick={() => setFeedbackMode('buzzer')}
                  >
                    Buzzer
                  </button>
                  <button
                    className={`segmented-btn ${feedbackMode === 'replay' ? 'active' : ''}`}
                    onClick={() => setFeedbackMode('replay')}
                  >
                    Replay
                  </button>
                  <button
                    className={`segmented-btn ${feedbackMode === 'off' ? 'active' : ''}`}
                    onClick={() => setFeedbackMode('off')}
                  >
                    Off
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeout Speed - Only show for practice mode */}
          {mode === 'practice' && (
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
            className="btn-start-session"
            disabled={sourceLoadError !== null && selectedSourceId !== 'random_letters'}
            style={{
              opacity: (sourceLoadError !== null && selectedSourceId !== 'random_letters') ? 0.5 : 1,
              cursor: (sourceLoadError !== null && selectedSourceId !== 'random_letters') ? 'not-allowed' : 'pointer'
            }}
            title={sourceLoadError ? 'Please resolve the source loading error before starting' : ''}
          >
            Start {modeConfig[mode].title.replace(' Mode', '')}
          </button>
        </div>
      </div>
    </div>
  );
}
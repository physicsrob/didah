import { useState, useEffect, useCallback } from 'react';
import type { SessionConfig, SessionMode, SpeedTier } from '../core/types/domain';
import type { FeedbackMode } from '../features/settings/store/types';
import { fetchSources, fetchSourceContent, fetchWordSources, fetchWordSourceContent } from '../features/sources';
import type { TextSource as ApiTextSource, SourceContent, WordSourceInfo as ApiWordSource } from '../features/sources';
import { useSettings } from '../features/settings/hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { HeaderBar } from '../components/HeaderBar';
import { getCharactersByCategory } from '../core/morse/alphabet';
import '../styles/main.css';
import '../styles/sessionConfig.css';
import '../styles/components.css';

type SessionConfigPageProps = {
  mode: SessionMode;
  onStart: (config: SessionConfig, sourceContent: SourceContent) => void;
};

export function SessionConfigPage({ mode, onStart }: SessionConfigPageProps) {

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
    },
    'word-practice': {
      title: 'Word Practice Mode',
      description: 'Multiple choice word recognition - select the word you hear from 3 options. Build whole-word fluency!'
    },
    'runner': {
      title: 'Morse Runner',
      description: 'Endless runner mini-game - type letters to jump over obstacles! Progress through 10 levels with increasing speed and difficulty.'
    }
  };

  // Use centralized settings
  const { settings, updateSetting, isLoading: settingsLoading } = useSettings();
  const { user } = useAuth();

  // Session configuration state - default values before settings load
  const [duration, setDuration] = useState<1 | 2 | 5>(1);
  const [speedTier, setSpeedTier] = useState<SpeedTier>('slow');
  const [selectedTextSourceId, setSelectedTextSourceId] = useState<string>('random_letters');
  const [selectedWordSourceId, setSelectedWordSourceId] = useState<string>('top-100');
  const [wpm, setWpm] = useState(15);
  const [farnsworthWpm, setFarnsworthWpm] = useState(10);
  const [extraWordSpacing, setExtraWordSpacing] = useState(0);
  const [startingLevel, setStartingLevel] = useState<number>(1);

  // Computed: current source ID based on mode
  const selectedSourceId = mode === 'word-practice' ? selectedWordSourceId : selectedTextSourceId;

  // Text source state
  const [availableSources, setAvailableSources] = useState<ApiTextSource[]>([]);
  const [sourceContent, setSourceContent] = useState<SourceContent | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourceLoadError, setSourceLoadError] = useState<string | null>(null);

  // Word source state (for word-practice mode)
  const [availableWordSources, setAvailableWordSources] = useState<ApiWordSource[]>([]);
  const [wordSourcesLoading, setWordSourcesLoading] = useState(false);

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

  // Build effective alphabet based on toggles
  const buildAlphabet = useCallback(() => {
    const { letters, numbers, standardPunctuation, advancedPunctuation } = getCharactersByCategory();
    const chars: string[] = [...letters];
    if (includeNumbers) chars.push(...numbers);
    if (includeStdPunct) chars.push(...standardPunctuation);
    if (includeAdvPunct) chars.push(...advancedPunctuation);
    return chars;
  }, [includeNumbers, includeStdPunct, includeAdvPunct]);

  // Helper function to load source content (consolidates duplicate logic)
  const loadSourceContent = useCallback(async (
    sourceId: string,
    options: { setError?: boolean } = {}
  ): Promise<SourceContent | null> => {
    // Word sources (for word-practice mode)
    if (mode === 'word-practice') {
      const wordSource = availableWordSources.find(s => s.id === sourceId);
      if (!wordSource) {
        console.error(`Word source not found: ${sourceId}`);
        if (options.setError) {
          setSourceLoadError(`Word source not found: ${sourceId}`);
        }
        return null;
      }

      try {
        const content = await fetchWordSourceContent(sourceId);
        return content;
      } catch (error) {
        console.error(`Failed to fetch word source ${sourceId}:`, error);
        if (options.setError) {
          setSourceLoadError(`Failed to load "${wordSource.name}". Please try again or select a different source.`);
        }
        return null;
      }
    }

    // Text sources (for other modes)
    const source = availableSources.find(s => s.id === sourceId);
    if (!source) {
      console.error(`Source not found: ${sourceId}`);
      if (options.setError) {
        setSourceLoadError(`Source not found: ${sourceId}`);
      }
      return null;
    }

    try {
      // For random sources, pass alphabet parameter
      let alphabet: string | undefined;
      if (source.backendId === 'random_letters') {
        alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      } else if (source.backendId === 'random_characters') {
        alphabet = buildAlphabet().join('');
      }

      const content = await fetchSourceContent(source.backendId, source.requiresAuth ?? false, alphabet);
      // Override the content ID with the frontend ID for proper source factory detection
      return { ...content, id: sourceId };
    } catch (error) {
      console.error(`Failed to fetch source ${source.backendId}:`, error);
      if (options.setError) {
        setSourceLoadError(`Failed to load "${source.name}". Please try again or select a different source.`);
      }
      return null;
    }
  }, [availableSources, availableWordSources, mode, buildAlphabet]);

  // Load settings into local state when they become available
  useEffect(() => {
    if (settings && !settingsLoading) {
      // Convert settings duration (60/120/300) to minutes (1/2/5)
      setDuration((settings.defaultDuration / 60) as 1 | 2 | 5);
      setSpeedTier(settings.defaultSpeedTier);
      setSelectedTextSourceId(settings.defaultSourceId);
      setSelectedWordSourceId(settings.defaultWordSourceId);
      setWpm(settings.wpm);
      setFarnsworthWpm(settings.farnsworthWpm);
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

  // Fetch available word sources when in word-practice mode
  useEffect(() => {
    if (mode !== 'word-practice') return;

    setWordSourcesLoading(true);
    fetchWordSources()
      .then(sources => {
        setAvailableWordSources(sources);
        // Only set default if current word source is invalid
        // This preserves the user's selection of top-1000, etc.
        if (!sources.find(s => s.id === selectedWordSourceId)) {
          setSelectedWordSourceId(sources[0]?.id || 'top-100');
        }
      })
      .catch(error => {
        console.error('Failed to fetch word sources:', error);
        setAvailableWordSources([]);
      })
      .finally(() => {
        setWordSourcesLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // Only run when mode changes, not when selectedWordSourceId changes

  // Fetch content when selectedSourceId changes or on mount
  useEffect(() => {
    if (!selectedSourceId) return;

    // For word-practice mode, wait until word sources are loaded
    if (mode === 'word-practice' && wordSourcesLoading) {
      return;
    }

    // For other modes, wait until text sources are loaded
    if (mode !== 'word-practice' && sourcesLoading) {
      return;
    }

    setSourceLoadError(null); // Clear any previous errors

    loadSourceContent(selectedSourceId, { setError: true })
      .then(content => {
        setSourceContent(content);
      });
  }, [selectedSourceId, loadSourceContent, mode, wordSourcesLoading, sourcesLoading]);

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
        settings.defaultSourceId !== selectedTextSourceId ||
        settings.defaultWordSourceId !== selectedWordSourceId ||
        settings.wpm !== wpm ||
        settings.farnsworthWpm !== farnsworthWpm ||
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
        if (settings.defaultSourceId !== selectedTextSourceId) {
          updateSetting('defaultSourceId', selectedTextSourceId);
        }
        if (settings.defaultWordSourceId !== selectedWordSourceId) {
          updateSetting('defaultWordSourceId', selectedWordSourceId);
        }
        if (settings.wpm !== wpm) {
          updateSetting('wpm', wpm);
        }
        if (settings.farnsworthWpm !== farnsworthWpm) {
          updateSetting('farnsworthWpm', farnsworthWpm);
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
  }, [duration, speedTier, selectedTextSourceId, selectedWordSourceId, wpm, farnsworthWpm, extraWordSpacing, feedbackMode, settings, settingsLoading, updateSetting]);

  // Handle source selection
  const handleSourceChange = async (sourceId: string) => {
    // Update appropriate source state based on mode
    if (mode === 'word-practice') {
      setSelectedWordSourceId(sourceId);
    } else {
      setSelectedTextSourceId(sourceId);
    }
    setSourceLoadError(null); // Clear any previous errors

    const content = await loadSourceContent(sourceId, { setError: true });
    setSourceContent(content);
  };

  const handleStartSession = async () => {
    // Don't start if there's a source loading error
    if (sourceLoadError) {
      console.warn('Cannot start session: source loading error');
      return;
    }

    const { feedback, replay } = getFeedbackConfig();

    // Find the source name from the appropriate sources array based on mode
    const sourceName = mode === 'word-practice'
      ? availableWordSources.find(s => s.id === selectedSourceId)?.name || 'Unknown'
      : availableSources.find(s => s.id === selectedSourceId)?.name || 'Unknown';

    const config: SessionConfig = {
      mode,
      lengthMs: mode === 'runner' ? Number.MAX_SAFE_INTEGER : duration * 60 * 1000,
      wpm,
      farnsworthWpm,
      speedTier,
      sourceId: selectedSourceId,
      sourceName,
      feedback,
      replay,
      effectiveAlphabet: buildAlphabet(),
      extraWordSpacing,
      ...(mode === 'runner' && { startingLevel }),
    };

    // Fetch fresh content for each new session (except random_letters which is generated locally)
    const freshContent = await loadSourceContent(selectedSourceId, { setError: false }) || sourceContent;

    // Call onStart callback with config and fresh content
    if (freshContent) {
      onStart(config, freshContent);
    }
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

      <div className="container container-centered">
        {/* Main Settings Card */}
        <div className="card mb-4 container-narrow" style={{
          padding: '32px'
        }}>
          {/* Mode Description */}
          <div className="session-config-section">
            <p className="body-regular session-config-description">
              <span className="session-config-mode-label">{modeConfig[mode].title}:</span> {modeConfig[mode].description}
            </p>
          </div>

          {/* Text Source or Word Source */}
          <div className="settings-row">
            <div className="settings-label">
              {mode === 'word-practice' ? 'Word Source' : 'Text Source'}
            </div>
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
                disabled={mode === 'word-practice' ? wordSourcesLoading : sourcesLoading}
              >
                {mode === 'word-practice' ? (
                  wordSourcesLoading ? (
                    <option>Loading word sources...</option>
                  ) : (
                    availableWordSources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.name} ({source.wordCount} words)
                      </option>
                    ))
                  )
                ) : (
                  sourcesLoading ? (
                    <option>Loading sources...</option>
                  ) : (
                    availableSources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))
                  )
                )}
              </select>
            </div>
          </div>

          {/* Error message for source loading */}
          {sourceLoadError && (
            <div className="session-config-error-container">
              <span>⚠️</span>
              <span className="session-config-error-text">{sourceLoadError}</span>
              <button
                onClick={() => handleSourceChange(selectedSourceId)}
                className="session-config-retry-btn"
              >
                Retry
              </button>
            </div>
          )}

          {/* Duration - hidden for runner mode (endless practice) */}
          {mode !== 'runner' && (
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
          )}

          {/* Character Speed - hidden for runner mode (uses level-based WPM) */}
          {mode !== 'runner' && (
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
                    // If Farnsworth WPM is greater than character WPM, cap it
                    if (farnsworthWpm > newWpm) {
                      setFarnsworthWpm(newWpm);
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
          )}

          {/* Starting Level - only for runner mode */}
          {mode === 'runner' && (
            <div className="settings-row">
              <div className="settings-label">Starting Level</div>
              <div className="settings-control">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={startingLevel}
                  onChange={(e) => setStartingLevel(Number(e.target.value))}
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
                  Level {startingLevel}
                </span>
              </div>
            </div>
          )}

          {/* Farnsworth Speed - Only show for listen, live-copy, and word-practice modes */}
          {(mode === 'listen' || mode === 'live-copy' || mode === 'word-practice') && (
            <div className="settings-row">
              <div className="settings-label">Farnsworth Speed</div>
              <div className="settings-control">
                <input
                  type="range"
                  min="5"
                  max={wpm} // Cannot exceed character speed
                  value={farnsworthWpm}
                  onChange={(e) => setFarnsworthWpm(Number(e.target.value))}
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
                  {farnsworthWpm} WPM{farnsworthWpm === wpm ? ' (std)' : ''}
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
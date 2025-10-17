import { useState, useEffect, useCallback } from 'react';
import type { SessionConfig, SessionMode, SpeedTier } from '../core/types/domain';
import type { FeedbackMode } from '../features/settings/store/types';
import { fetchSources, fetchSourceContent } from '../features/sources';
import type { TextSource as ApiTextSource, SourceContent } from '../features/sources';
import { useSettings } from '../features/settings/hooks/useSettings';
import { useUser } from '@clerk/clerk-react';
import { HeaderBar } from '../components/HeaderBar';
import { TextSourceModal } from '../components/TextSourceModal';
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
    'head-copy': {
      title: 'Head Copy Mode',
      description: 'Multiple choice whole-word recognition. Select the correct word to build up fluency and the ability to head copy.'
    },
    'runner': {
      title: 'Morse Runner',
      description: 'Endless runner mini-game - type letters to jump over obstacles! Progress through 10 levels with increasing speed and difficulty.'
    }
  };

  // Use centralized settings
  const { settings, updateSetting, isLoading: settingsLoading } = useSettings();
  const { user } = useUser();

  // Session configuration state - default values before settings load
  const [duration, setDuration] = useState<1 | 2 | 5>(1);
  const [speedTier, setSpeedTier] = useState<SpeedTier>('slow');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('random_letters');
  const [wpm, setWpm] = useState(15);
  const [farnsworthWpm, setFarnsworthWpm] = useState(10);
  const [extraWordSpacing, setExtraWordSpacing] = useState(0);
  const [startingLevel, setStartingLevel] = useState<number>(1);

  // Source state
  const [availableSources, setAvailableSources] = useState<ApiTextSource[]>([]);
  const [sourceContent, setSourceContent] = useState<SourceContent | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourceLoadError, setSourceLoadError] = useState<string | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

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

  // Helper function to load source content
  const loadSourceContent = useCallback(async (
    sourceId: string,
    options: { setError?: boolean } = {}
  ): Promise<SourceContent | null> => {
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
      if (source.id === 'random_letters') {
        alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      } else if (source.id === 'random_characters') {
        alphabet = buildAlphabet().join('');
      }

      const content = await fetchSourceContent(source.id, source.requiresAuth ?? false, alphabet);
      return content;
    } catch (error) {
      console.error(`Failed to fetch source ${source.id}:`, error);
      if (options.setError) {
        setSourceLoadError(`Failed to load "${source.name}". Please try again or select a different source.`);
      }
      return null;
    }
  }, [availableSources, buildAlphabet]);

  // Load settings into local state when they become available
  useEffect(() => {
    if (settings && !settingsLoading) {
      // Convert settings duration (60/120/300) to minutes (1/2/5)
      setDuration((settings.defaultDuration / 60) as 1 | 2 | 5);
      setSpeedTier(settings.defaultSpeedTier);
      // For head-copy mode, use defaultHeadCopySourceId; otherwise defaultSourceId
      setSelectedSourceId(mode === 'head-copy' ? settings.defaultHeadCopySourceId : settings.defaultSourceId);
      setWpm(settings.wpm);
      setFarnsworthWpm(settings.farnsworthWpm);
      setExtraWordSpacing(settings.extraWordSpacing);

      // Direct assignment - feedbackMode is stored as-is now
      setFeedbackMode(settings.feedbackMode);
    }
  }, [settings, settingsLoading, mode]);

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
        setAvailableSources([{ id: 'random_letters', name: 'Random Letters', type: 'generated' }]);
      })
      .finally(() => {
        setSourcesLoading(false);
      });
  }, [user]);

  // Fetch content when selectedSourceId changes or on mount
  useEffect(() => {
    if (!selectedSourceId) return;

    // Wait until sources are loaded
    if (sourcesLoading) {
      return;
    }

    setSourceLoadError(null); // Clear any previous errors

    loadSourceContent(selectedSourceId, { setError: true })
      .then(content => {
        setSourceContent(content);
      });
  }, [selectedSourceId, loadSourceContent, sourcesLoading]);

  // Save settings to centralized store when they change
  useEffect(() => {
    if (!settings || settingsLoading) return;

    // Create a debounce timer to batch updates
    const timer = setTimeout(() => {
      const durationInSeconds = (duration * 60) as 60 | 120 | 300;

      // For head-copy mode, save to defaultHeadCopySourceId; otherwise defaultSourceId
      const settingKey = mode === 'head-copy' ? 'defaultHeadCopySourceId' : 'defaultSourceId';
      const currentSettingValue = mode === 'head-copy' ? settings.defaultHeadCopySourceId : settings.defaultSourceId;

      // Check what needs updating
      const needsUpdate =
        settings.defaultDuration !== durationInSeconds ||
        settings.defaultSpeedTier !== speedTier ||
        currentSettingValue !== selectedSourceId ||
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
        if (currentSettingValue !== selectedSourceId) {
          updateSetting(settingKey, selectedSourceId);
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
  }, [duration, speedTier, selectedSourceId, wpm, farnsworthWpm, extraWordSpacing, feedbackMode, settings, settingsLoading, updateSetting, mode]);

  // Handle source selection
  const handleSourceChange = async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setSourceLoadError(null); // Clear any previous errors

    const content = await loadSourceContent(sourceId, { setError: true });
    setSourceContent(content);
  };

  // Handle favorite toggling
  const handleToggleFavorite = (sourceId: string) => {
    if (!settings) return;

    const currentFavorites = settings.favoriteSourceIds || [];
    const newFavorites = currentFavorites.includes(sourceId)
      ? currentFavorites.filter(id => id !== sourceId)
      : [...currentFavorites, sourceId];

    updateSetting('favoriteSourceIds', newFavorites);
  };

  const handleStartSession = async () => {
    // Don't start if there's a source loading error
    if (sourceLoadError) {
      console.warn('Cannot start session: source loading error');
      return;
    }

    const { feedback, replay } = getFeedbackConfig();

    // Find the source name
    const sourceName = availableSources.find(s => s.id === selectedSourceId)?.name || 'Unknown';

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

          {/* Text Source */}
          <div className="settings-row">
            <div className="settings-label">
              {mode === 'head-copy' ? 'Word Source' : 'Text Source'}
            </div>
            <div className="settings-control">
              <button
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  background: 'var(--background-tertiary)',
                  color: '#ffffff',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.15s'
                }}
                onClick={() => setIsSourceModalOpen(true)}
                disabled={sourcesLoading}
                onMouseEnter={(e) => {
                  if (!sourcesLoading) {
                    e.currentTarget.style.background = 'var(--color-tertiary-gray)';
                    e.currentTarget.style.borderColor = 'var(--border-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--background-tertiary)';
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                }}
              >
                {sourcesLoading ? (
                  <span>Loading sources...</span>
                ) : (
                  <>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {availableSources.find(s => s.id === selectedSourceId)?.name || 'Select source'}
                    </span>
                    {availableSources.find(s => s.id === selectedSourceId)?.description && (
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {availableSources.find(s => s.id === selectedSourceId)?.description}
                      </span>
                    )}
                  </>
                )}
              </button>
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

          {/* Farnsworth Speed - Only show for listen, live-copy, and head-copy modes */}
          {(mode === 'listen' || mode === 'live-copy' || mode === 'head-copy') && (
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

      {/* Text Source Modal */}
      <TextSourceModal
        isOpen={isSourceModalOpen}
        sources={availableSources}
        selectedId={selectedSourceId}
        favorites={settings?.favoriteSourceIds || []}
        onSelect={handleSourceChange}
        onToggleFavorite={handleToggleFavorite}
        onClose={() => setIsSourceModalOpen(false)}
      />
    </div>
  );
}
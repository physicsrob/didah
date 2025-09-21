import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { SessionConfig } from '../core/types/domain';
import { getActiveWindowMs, getPassiveTimingMultipliers } from '../core/morse/timing';
import '../styles/main.css';

type SpeedTier = 'slow' | 'medium' | 'fast' | 'lightning';
type SessionMode = 'practice' | 'listen' | 'live-copy';
type TextSource = 'randomLetters' | 'randomWords' | 'redditHeadlines' | 'hardCharacters';
type FeedbackType = 'buzzer' | 'flash' | 'both';

export function SessionConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get mode from navigation state (set by HomePage)
  const mode: SessionMode = (location.state as any)?.mode || 'practice';

  // Session configuration state
  const [duration, setDuration] = useState<1 | 2 | 5>(1);
  const [speedTier, setSpeedTier] = useState<SpeedTier>('slow');
  const [textSource, setTextSource] = useState<TextSource>('randomLetters');
  const [wpm, setWpm] = useState(15);

  // Load settings from localStorage
  const [feedback, setFeedback] = useState<FeedbackType>(() =>
    (localStorage.getItem('feedback') as FeedbackType) || 'both'
  );
  const [replay, setReplay] = useState(() => localStorage.getItem('replay') !== 'false');
  const [includeNumbers, setIncludeNumbers] = useState(() => localStorage.getItem('includeNumbers') !== 'false');
  const [includeStdPunct, setIncludeStdPunct] = useState(() => localStorage.getItem('includeStdPunct') !== 'false');
  const [includeAdvPunct, setIncludeAdvPunct] = useState(() => localStorage.getItem('includeAdvPunct') === 'true');

  // Re-read localStorage when component mounts/becomes visible
  useEffect(() => {
    const updateSettings = () => {
      setFeedback((localStorage.getItem('feedback') as FeedbackType) || 'both');
      setReplay(localStorage.getItem('replay') !== 'false');
      setIncludeNumbers(localStorage.getItem('includeNumbers') !== 'false');
      setIncludeStdPunct(localStorage.getItem('includeStdPunct') !== 'false');
      setIncludeAdvPunct(localStorage.getItem('includeAdvPunct') === 'true');
    };

    updateSettings();

    // Also listen for storage events (if settings changed in another tab)
    window.addEventListener('storage', updateSettings);
    return () => window.removeEventListener('storage', updateSettings);
  }, []);

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
      sourceId: textSource,
      feedback,
      replay,
      effectiveAlphabet: buildAlphabet(),
    };

    // Navigate to session with config
    navigate('/session', { state: { config } });
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient">
      <div className="container mx-auto px-4 py-8">
        <h1 className="brand-title text-center mb-8">Session Configuration</h1>

        {/* Main Settings Card */}
        <div className="card mb-4 max-w-2xl mx-auto">
          {/* Duration */}
          <div className="form-group mb-4">
            <label className="form-label">Duration</label>
            <div className="flex gap-4">
              <button
                className={`btn ${duration === 1 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDuration(1)}
              >
                1 minute
              </button>
              <button
                className={`btn ${duration === 2 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDuration(2)}
              >
                2 minutes
              </button>
              <button
                className={`btn ${duration === 5 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDuration(5)}
              >
                5 minutes
              </button>
            </div>
          </div>

          {/* Mode Display */}
          <div className="form-group mb-4">
            <label className="form-label">Mode</label>
            <div className="p-3 bg-gray-100 rounded border">
              <h3 className="font-semibold text-lg capitalize">{mode.replace('-', ' ')}</h3>
              <p className="body-small text-muted mt-1">
                {mode === 'practice' && 'Type what you hear - immediate feedback on correctness'}
                {mode === 'listen' && 'Listen to characters - they will be revealed after playing'}
                {mode === 'live-copy' && 'Real-time copying - continuous transmission like real CW'}
              </p>
            </div>
          </div>

          {/* Speed Tier */}
          <div className="form-group mb-4">
            <label className="form-label">Recognition Speed</label>
            <div className="flex gap-3">
              <button
                className={`btn btn-small ${speedTier === 'slow' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpeedTier('slow')}
              >
                Slow
              </button>
              <button
                className={`btn btn-small ${speedTier === 'medium' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpeedTier('medium')}
              >
                Medium
              </button>
              <button
                className={`btn btn-small ${speedTier === 'fast' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpeedTier('fast')}
              >
                Fast
              </button>
              <button
                className={`btn btn-small ${speedTier === 'lightning' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpeedTier('lightning')}
              >
                Lightning
              </button>
            </div>
            <p className="body-small text-muted mt-2">
              {mode === 'practice' && `Recognition window: ${getActiveWindowMs(wpm, speedTier)}ms`}
              {mode === 'listen' && (() => {
                const timing = getPassiveTimingMultipliers(speedTier);
                return `${timing.preRevealDits} dits → reveal → ${timing.postRevealDits} dits`;
              })()}
              {mode === 'live-copy' && 'Continuous transmission - standard 3 dit spacing between characters'}
            </p>
          </div>

          {/* Text Source */}
          <div className="form-group mb-4">
            <label className="form-label">Text Source</label>
            <select
              className="form-select w-full"
              value={textSource}
              onChange={(e) => setTextSource(e.target.value as TextSource)}
            >
              <option value="randomLetters">Random Letters</option>
              <option value="randomWords" disabled>Random Words (Coming Soon)</option>
              <option value="redditHeadlines" disabled>Reddit Headlines (Coming Soon)</option>
              <option value="hardCharacters" disabled>Hard Characters (Coming Soon)</option>
            </select>
          </div>

          {/* WPM */}
          <div className="form-group">
            <label className="form-label">Character Speed (WPM)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="40"
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                className="flex-1"
              />
              <span className="body-large" style={{ minWidth: '60px', textAlign: 'right' }}>
                {wpm} WPM
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            className="btn btn-secondary btn-large"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-large"
            onClick={handleStartSession}
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionConfig } from '../core/types/domain';
import '../styles/main.css';

type SpeedTier = 'slow' | 'medium' | 'fast' | 'lightning';
type FeedbackType = 'buzzer' | 'flash' | 'both';
type SessionMode = 'active' | 'passive';
type TextSource = 'randomLetters' | 'randomWords' | 'redditHeadlines' | 'hardCharacters';

export function SessionConfigPage() {
  const navigate = useNavigate();

  // Session configuration state
  const [duration, setDuration] = useState<1 | 2 | 5>(1);
  const [mode, setMode] = useState<SessionMode>('active');
  const [speedTier, setSpeedTier] = useState<SpeedTier>('slow');
  const [textSource, setTextSource] = useState<TextSource>('randomLetters');
  const [wpm, setWpm] = useState(15);

  // Active mode specific settings
  const [feedback, setFeedback] = useState<FeedbackType>('both');
  const [replay, setReplay] = useState(true);

  // Character set toggles
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeStdPunct, setIncludeStdPunct] = useState(true);
  const [includeAdvPunct, setIncludeAdvPunct] = useState(false);

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
        <div className="card mb-6 max-w-2xl mx-auto">
          <h2 className="heading-2 mb-6">Basic Settings</h2>

          {/* Duration */}
          <div className="form-group mb-6">
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

          {/* Mode */}
          <div className="form-group mb-6">
            <label className="form-label">Mode</label>
            <div className="flex gap-4">
              <button
                className={`btn ${mode === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMode('active')}
              >
                Active
              </button>
              <button
                className={`btn ${mode === 'passive' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMode('passive')}
              >
                Passive
              </button>
            </div>
            <p className="body-small text-muted mt-2">
              {mode === 'active'
                ? 'Type what you hear - immediate feedback on correctness'
                : 'Listen to characters - they will be revealed after playing'}
            </p>
          </div>

          {/* Speed Tier */}
          <div className="form-group mb-6">
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
              {mode === 'active'
                ? `${speedTier === 'slow' ? '5×' : speedTier === 'medium' ? '3×' : speedTier === 'fast' ? '2×' : '1×'} dit length recognition window`
                : 'Controls timing between character playback and reveal'}
            </p>
          </div>

          {/* Text Source */}
          <div className="form-group mb-6">
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

        {/* Active Mode Settings */}
        {mode === 'active' && (
          <div className="card mb-6 max-w-2xl mx-auto">
            <h2 className="heading-2 mb-6">Active Mode Settings</h2>

            {/* Feedback Type */}
            <div className="form-group mb-6">
              <label className="form-label">Error Feedback</label>
              <div className="flex gap-3">
                <button
                  className={`btn btn-small ${feedback === 'buzzer' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFeedback('buzzer')}
                >
                  Buzzer
                </button>
                <button
                  className={`btn btn-small ${feedback === 'flash' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFeedback('flash')}
                >
                  Flash
                </button>
                <button
                  className={`btn btn-small ${feedback === 'both' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFeedback('both')}
                >
                  Both
                </button>
              </div>
            </div>

            {/* Replay on Timeout */}
            <div className="form-group">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={replay}
                  onChange={(e) => setReplay(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="form-label mb-0">Show missed characters</span>
              </label>
              <p className="body-small text-muted mt-2">
                When you timeout, display the character with its Morse pattern
              </p>
            </div>
          </div>
        )}

        {/* Character Sets */}
        <div className="card mb-6 max-w-2xl mx-auto">
          <h2 className="heading-2 mb-6">Character Sets</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeNumbers}
                onChange={(e) => setIncludeNumbers(e.target.checked)}
                className="form-checkbox"
              />
              <span>Include numbers (0-9)</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeStdPunct}
                onChange={(e) => setIncludeStdPunct(e.target.checked)}
                className="form-checkbox"
              />
              <span>Include standard punctuation (. , ? / =)</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeAdvPunct}
                onChange={(e) => setIncludeAdvPunct(e.target.checked)}
                className="form-checkbox"
              />
              <span>Include advanced punctuation (: ; ! @ # $ etc.)</span>
            </label>
          </div>

          <div className="mt-4 p-3 bg-surface-light rounded">
            <p className="body-small text-muted">
              <strong>Active characters:</strong> {buildAlphabet().join(' ')}
            </p>
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
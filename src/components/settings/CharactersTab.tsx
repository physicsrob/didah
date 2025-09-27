import { useSettings } from '../../features/settings/hooks/useSettings'

export default function CharactersTab() {
  const { settings, updateSetting } = useSettings()

  const buildAlphabet = () => {
    if (!settings) return []
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (settings.includeNumbers) alphabet += '0123456789'
    if (settings.includeStdPunct) alphabet += '.,?/='
    if (settings.includeAdvPunct) alphabet += ':;!@#$%^&*()+-_[]{}|\\<>\'"`~'
    return alphabet.split('')
  }

  if (!settings) return null

  return (
    <div>
      <div className="settings-row">
        <label className="checkbox-label" style={{ margin: 0, width: '100%', justifyContent: 'space-between' }}>
          <span>Include Numbers (0-9)</span>
          <input
            type="checkbox"
            checked={settings.includeNumbers}
            onChange={(e) => updateSetting('includeNumbers', e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              accentColor: 'var(--color-blue-primary)',
            }}
          />
        </label>
      </div>

      <div className="settings-row">
        <label className="checkbox-label" style={{ margin: 0, width: '100%', justifyContent: 'space-between' }}>
          <span>Include Standard Punctuation (. , ? / =)</span>
          <input
            type="checkbox"
            checked={settings.includeStdPunct}
            onChange={(e) => updateSetting('includeStdPunct', e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              accentColor: 'var(--color-blue-primary)',
            }}
          />
        </label>
      </div>

      <div className="settings-row">
        <label className="checkbox-label" style={{ margin: 0, width: '100%', justifyContent: 'space-between' }}>
          <span>Include Advanced Punctuation (: ; ! @ # $ etc.)</span>
          <input
            type="checkbox"
            checked={settings.includeAdvPunct}
            onChange={(e) => updateSetting('includeAdvPunct', e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              accentColor: 'var(--color-blue-primary)',
            }}
          />
        </label>
      </div>

      <div style={{
        marginTop: '32px',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <p className="body-small" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Active characters:</strong> {buildAlphabet().join(' ')}
        </p>
      </div>
    </div>
  )
}
import { useSettings } from '../../features/settings/hooks/useSettings'
import { getCharactersByCategory } from '../../core/morse/alphabet'
import './settings.css'
import '../../styles/components.css'

export default function CharactersTab() {
  const { settings, updateSetting } = useSettings()

  const buildAlphabet = () => {
    if (!settings) return []
    const { letters, numbers, standardPunctuation, advancedPunctuation } = getCharactersByCategory()
    const chars: string[] = [...letters]
    if (settings.includeNumbers) chars.push(...numbers)
    if (settings.includeStdPunct) chars.push(...standardPunctuation)
    if (settings.includeAdvPunct) chars.push(...advancedPunctuation)
    return chars
  }

  if (!settings) return null

  return (
    <div>
      <div className="settings-row">
        <label className="checkbox-label checkbox-row">
          <span>Include Numbers (0-9)</span>
          <input
            type="checkbox"
            className="checkbox-input"
            checked={settings.includeNumbers}
            onChange={(e) => updateSetting('includeNumbers', e.target.checked)}
          />
        </label>
      </div>

      <div className="settings-row">
        <label className="checkbox-label checkbox-row">
          <span>Include Standard Punctuation (. , ? / =)</span>
          <input
            type="checkbox"
            className="checkbox-input"
            checked={settings.includeStdPunct}
            onChange={(e) => updateSetting('includeStdPunct', e.target.checked)}
          />
        </label>
      </div>

      <div className="settings-row">
        <label className="checkbox-label checkbox-row">
          <span>Include Advanced Punctuation (: ; ! @ # $ etc.)</span>
          <input
            type="checkbox"
            className="checkbox-input"
            checked={settings.includeAdvPunct}
            onChange={(e) => updateSetting('includeAdvPunct', e.target.checked)}
          />
        </label>
      </div>

      <div className="settings-active-chars">
        <p className="body-small settings-active-chars__text">
          <strong className="settings-active-chars__label">Active characters:</strong> {buildAlphabet().join(' ')}
        </p>
      </div>
    </div>
  )
}
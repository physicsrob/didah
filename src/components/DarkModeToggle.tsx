import { useTheme } from '../hooks/useTheme'
import './DarkModeToggle.css'

interface DarkModeToggleProps {
  variant?: 'inline' | 'menu-item'
}

export function DarkModeToggle({ variant = 'inline' }: DarkModeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  if (variant === 'menu-item') {
    return (
      <button className="dark-mode-toggle-menu-item" onClick={toggleTheme}>
        <span className="dark-mode-toggle-menu-label">Dark Mode</span>
        <div className="dark-mode-toggle-switch">
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={toggleTheme}
            className="dark-mode-toggle-input"
          />
          <span className="dark-mode-toggle-slider"></span>
        </div>
      </button>
    )
  }

  return (
    <div className="dark-mode-toggle">
      <label className="dark-mode-toggle-label">
        <span className="dark-mode-toggle-text">Dark Mode</span>
        <div className="dark-mode-toggle-switch">
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={toggleTheme}
            className="dark-mode-toggle-input"
          />
          <span className="dark-mode-toggle-slider"></span>
        </div>
      </label>
    </div>
  )
}

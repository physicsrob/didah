import { UserButton } from '@clerk/clerk-react'
import { useTheme } from '../hooks/useTheme'
import { InlineToggle } from './InlineToggle'
import './UserDropdown.css'

export function UserDropdown() {
  const { theme, toggleTheme } = useTheme()

  const clerkAppearance = {
    elements: {
      avatarBox: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
      },
      userButtonPopoverCard: {
        background: theme === 'light' ? '#ffffff' : '#1f2937',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        border: theme === 'light' ? '1px solid #e5e7eb' : '1px solid rgba(255, 255, 255, 0.1)',
      },
      userButtonPopoverActionButton: {
        color: theme === 'light' ? '#374151' : '#e5e7eb',
      },
      userButtonPopoverActionButtonText: {
        '&:hover': {
          background: theme === 'light' ? '#f3f4f6' : '#374151',
        }
      }
    }
  }

  return (
    <div className="user-dropdown">
      <div className="user-dropdown__wrapper">
        <UserButton
          afterSignOutUrl="/"
          appearance={clerkAppearance}
        >
          <UserButton.MenuItems>
            <UserButton.Action
              label="Dark Mode"
              labelIcon={<InlineToggle checked={theme === 'dark'} />}
              onClick={toggleTheme}
            />
          </UserButton.MenuItems>
        </UserButton>
      </div>
    </div>
  )
}
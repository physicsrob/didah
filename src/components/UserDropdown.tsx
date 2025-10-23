import { UserButton, useUser } from '@clerk/clerk-react'
import { useRef } from 'react'
import { useTheme } from '../hooks/useTheme'
import { InlineToggle } from './InlineToggle'
import './UserDropdown.css'

export function UserDropdown() {
  const { user } = useUser()
  const { theme, toggleTheme } = useTheme()
  const userButtonRef = useRef<HTMLDivElement>(null)

  const handleWrapperClick = () => {
    // Find and click the Clerk UserButton when the wrapper is clicked
    const button = userButtonRef.current?.querySelector('button')
    if (button) {
      button.click()
    }
  }

  const clerkAppearance = {
    elements: {
      avatarBox: "w-9 h-9 rounded-full border-2 shadow-lg",
      userButtonTrigger: "focus:outline-none focus:ring-2 focus:ring-blue-400/50",
      userButtonPopoverCard: theme === 'light'
        ? "bg-white shadow-lg border border-gray-200"
        : "bg-gray-800 shadow-lg",
      userButtonPopoverActionButton: theme === 'light'
        ? "text-gray-700 hover:bg-gray-100"
        : "text-gray-200 hover:bg-gray-700"
    }
  }

  return (
    <div className="user-dropdown">
      <div className="user-dropdown__wrapper" onClick={handleWrapperClick}>
        <span className="user-dropdown__name">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
        <div ref={userButtonRef}>
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
    </div>
  )
}
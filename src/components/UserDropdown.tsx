import { UserButton, useUser } from '@clerk/clerk-react'
import { useRef } from 'react'
import './UserDropdown.css'

export function UserDropdown() {
  const { user } = useUser()
  const userButtonRef = useRef<HTMLDivElement>(null)

  const handleWrapperClick = () => {
    // Find and click the Clerk UserButton when the wrapper is clicked
    const button = userButtonRef.current?.querySelector('button')
    if (button) {
      button.click()
    }
  }

  return (
    <div className="user-dropdown">
      <div className="user-dropdown__wrapper" onClick={handleWrapperClick}>
        <span className="user-dropdown__name">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
        <div ref={userButtonRef}>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9 rounded-full border-2 border-white/20 shadow-lg",
                userButtonTrigger: "focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
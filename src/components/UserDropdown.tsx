import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import './UserDropdown.css'

export function UserDropdown() {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) return null

  return (
    <div ref={dropdownRef} className="user-dropdown">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="user-dropdown__trigger"
      >
        <span className="user-dropdown__name">
          {user.name}
        </span>
        <img
          src={user.picture}
          alt={user.name}
          className="user-dropdown__avatar"
        />
        <svg
          className={`user-dropdown__arrow ${isOpen ? 'user-dropdown__arrow--open' : ''}`}
          fill="white"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="user-dropdown__menu">
          {/* User Info Section */}
          <div className="user-dropdown__user-info">
            <div className="user-dropdown__user-details">
              <img
                src={user.picture}
                alt={user.name}
                className="user-dropdown__avatar--large"
              />
              <div>
                <div className="user-dropdown__user-name">
                  {user.name}
                </div>
                <div className="user-dropdown__user-email">
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => {
              signOut()
              setIsOpen(false)
            }}
            className="user-dropdown__sign-out"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

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
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '20px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '13px',
          fontWeight: '400',
          marginRight: '4px'
        }}>
          {user.name}
        </span>
        <img
          src={user.picture}
          alt={user.name}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        />
        <svg
          style={{
            width: '12px',
            height: '12px',
            marginLeft: '2px',
            opacity: 0.6,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
          fill="white"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          minWidth: '200px',
          background: 'rgba(42, 42, 42, 0.98)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          zIndex: 1000,
          animation: 'fadeInScale 0.15s ease-out'
        }}>
          {/* User Info Section */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={user.picture}
                alt={user.name}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                }}
              />
              <div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {user.name}
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '12px',
                  marginTop: '2px'
                }}>
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
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
            }}
          >
            Sign out
          </button>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
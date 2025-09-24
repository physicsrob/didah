import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { settingsStore } from '../store/settingsStore'

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { user } = useAuth()
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get the token from localStorage if user is authenticated
    const token = user ? localStorage.getItem('google_token') : null

    if (!token) {
      // User is not authenticated, use localStorage-only mode
      settingsStore.initializeAnonymous()
      setInitialized(true)
      return
    }

    // Check if token is expired before using it
    const isTokenExpired = (token: string): boolean => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (!payload.exp) return false
        const now = Math.floor(Date.now() / 1000)
        return payload.exp < now
      } catch {
        return true
      }
    }

    if (isTokenExpired(token)) {
      console.log('Token expired, clearing and using anonymous mode')
      localStorage.removeItem('google_token')
      settingsStore.initializeAnonymous()
      setInitialized(true)
      setError('Your session has expired. Please sign in again to sync your settings.')
      return
    }

    // Initialize settings with the auth token
    settingsStore.initialize(token)
      .then(() => {
        setInitialized(true)
        setError(null)
      })
      .catch(err => {
        console.error('Failed to initialize settings:', err)

        // Check if it's an authentication error
        if (err.message && err.message.includes('Authentication failed')) {
          localStorage.removeItem('google_token')
          setError('Your session has expired. Please sign in again to sync your settings.')
          // Fall back to anonymous mode
          settingsStore.initializeAnonymous()
        } else {
          setError('Unable to load settings from server. Using local settings.')
        }

        // Continue with defaults even if fetch fails
        setInitialized(true)
      })

    // Cleanup on logout
    return () => {
      if (!user) {
        settingsStore.clear()
      }
    }
  }, [user])

  // Show loading state during initial settings fetch
  // Only show loading if we have a user and haven't initialized yet
  if (user && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-center">
          <h2 className="heading-2 mb-4">Loading settings...</h2>
          {error && (
            <p className="text-red-500 mt-2">{error}</p>
          )}
        </div>
      </div>
    )
  }

  // Show session expired warning if there's an authentication error
  if (error && error.includes('session has expired')) {
    return (
      <>
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: 'rgba(239, 68, 68, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          fontSize: '14px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          ⚠️ {error}
        </div>
        {children}
      </>
    )
  }

  return <>{children}</>
}
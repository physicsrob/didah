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

    // Initialize settings with the auth token
    settingsStore.initialize(token)
      .then(() => {
        setInitialized(true)
        setError(null)
      })
      .catch(err => {
        console.error('Failed to initialize settings:', err)

        // For any error (auth or network), fall back to anonymous mode
        localStorage.removeItem('google_token')
        settingsStore.initializeAnonymous()
        setError('Working offline - changes will sync when you sign in again.')
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

  // Show warning banner if working offline
  if (error) {
    return (
      <>
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: 'rgba(251, 146, 60, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          fontSize: '14px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          📡 {error}
        </div>
        {children}
      </>
    )
  }

  return <>{children}</>
}
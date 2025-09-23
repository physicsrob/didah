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
      // User is not authenticated, clear settings
      settingsStore.clear()
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
        setError('Failed to load settings')
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

  return <>{children}</>
}
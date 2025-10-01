import React, { createContext, useState, useEffect } from 'react'
import { debug } from '../core/debug'

interface User {
  id: string
  email: string
  name: string
  picture?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  signOut: () => void
  handleCredentialResponse: (response: google.CredentialResponse) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
export { AuthContext }

interface AuthProviderProps {
  children: React.ReactNode
}

// Helper function to check if a JWT token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload.exp) return false // No expiration claim

    const now = Math.floor(Date.now() / 1000)
    return payload.exp < now
  } catch (error) {
    console.error('Error checking token expiration:', error)
    return true // Consider invalid tokens as expired
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Restore user from localStorage on mount
    try {
      const token = localStorage.getItem('google_token')
      if (token) {
        // Check if token is expired
        if (isTokenExpired(token)) {
          debug.log('Stored token is expired, clearing...')
          localStorage.removeItem('google_token')
          return null
        }

        const payload = JSON.parse(atob(token.split('.')[1]))
        return {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        }
      }
    } catch (error) {
      console.error('Error restoring user from localStorage:', error)
      // Clear invalid tokens
      try {
        localStorage.removeItem('google_token')
      } catch (storageError) {
        console.error('Error clearing invalid token:', storageError)
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check token expiry and trigger re-auth before it expires
  useEffect(() => {
    if (!user) return

    const checkTokenExpiry = () => {
      const token = localStorage.getItem('google_token')
      if (!token) return

      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (!payload.exp) return

        const now = Math.floor(Date.now() / 1000)
        const timeUntilExpiry = payload.exp - now

        // If token expires in less than 5 minutes, trigger One Tap
        if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
          debug.log('Token expiring soon, triggering re-authentication...')
          if (window.google) {
            window.google.accounts.id.prompt((notification) => {
              if (notification.isNotDisplayed()) {
                debug.log('One Tap not displayed for refresh:', notification.getNotDisplayedReason())
              }
            })
          }
        }
      } catch (error) {
        console.error('Error checking token expiry:', error)
      }
    }

    // Check immediately and then every minute
    checkTokenExpiry()
    const intervalId = setInterval(checkTokenExpiry, 60000)

    return () => clearInterval(intervalId)
  }, [user])

  useEffect(() => {
    // Check for required environment variable
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.')
      setIsLoading(false)
      console.error('Missing VITE_GOOGLE_CLIENT_ID environment variable')
      return
    }

    let retryCount = 0
    const maxRetries = 50 // Max 5 seconds of retrying
    let timeoutId: NodeJS.Timeout

    // Initialize Google Identity Services
    const initializeGoogleAuth = () => {
      if (typeof window !== 'undefined' && window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: true, // Automatically sign in returning users
          })

          // Show One Tap prompt for signed-out users or expired tokens
          if (!user) {
            window.google.accounts.id.prompt((notification) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                debug.log('One Tap not displayed:', notification.getNotDisplayedReason())
              }
            })
          }

          setIsLoading(false)
          setError(null) // Clear any previous errors
        } catch (error) {
          const message = 'Failed to initialize Google authentication'
          console.error(message, error)
          setError(message)
          setIsLoading(false)
        }
      } else if (retryCount < maxRetries) {
        retryCount++
        timeoutId = setTimeout(initializeGoogleAuth, 100)
      } else {
        const message = 'Google authentication service failed to load. Please check your internet connection and try refreshing the page.'
        console.error(message)
        setError(message)
        setIsLoading(false)
      }
    }

    initializeGoogleAuth()

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [user])

  const handleCredentialResponse = (response: google.CredentialResponse) => {
    try {
      // Decode the JWT token to get user info
      const payload = JSON.parse(atob(response.credential.split('.')[1]))

      const userData: User = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      }

      setUser(userData)

      // Store token for API calls if needed
      localStorage.setItem('google_token', response.credential)
    } catch (error) {
      console.error('Error processing Google authentication:', error)
    }
  }


  const signOut = () => {
    setUser(null)
    localStorage.removeItem('google_token')
    if (window.google) {
      window.google.accounts.id.disableAutoSelect()
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    signOut,
    handleCredentialResponse,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
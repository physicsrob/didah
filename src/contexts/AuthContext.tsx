import React, { createContext, useContext, useState, useEffect } from 'react'

export interface User {
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

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Restore user from localStorage on mount
    try {
      const token = localStorage.getItem('google_token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        }
      }
    } catch {}
    return null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          })
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
  }, [])

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
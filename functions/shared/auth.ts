import { User } from './types'

// Simple JWT decode without signature verification for Google ID tokens
// In production, you'd want to verify the signature against Google's public keys
export function decodeGoogleToken(token: string): User {
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, '')

    // Parse JWT payload (Google ID tokens are JWTs)
    const parts = cleanToken.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    const payload = JSON.parse(atob(parts[1]))

    // Validate required fields
    if (!payload.sub || !payload.email || !payload.name) {
      throw new Error('Token missing required fields')
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired')
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    }
  } catch (error) {
    throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function getUserIdFromToken(token: string): string {
  const user = decodeGoogleToken(token)
  return user.id
}
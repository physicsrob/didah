import { User } from './types'

interface TokenInfoResponse {
  sub: string
  email: string
  name?: string
  picture?: string
  aud: string
  exp: string
  iss: string
  error_description?: string
}

/**
 * Verifies a Google ID token using Google's tokeninfo endpoint.
 * This validates:
 * - JWT signature (verified by Google)
 * - Issuer (iss claim)
 * - Audience (aud claim)
 * - Expiration (exp claim)
 *
 * @param token - The Google ID token to verify
 * @param expectedClientId - The expected Google Client ID (aud claim)
 * @returns User object if token is valid
 * @throws Error if token is invalid, expired, or verification fails
 */
export async function verifyGoogleToken(token: string, expectedClientId: string): Promise<User> {
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, '')

    // Verify token using Google's tokeninfo endpoint
    // This endpoint validates signature, expiration, and returns token claims
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${cleanToken}`)

    if (!response.ok) {
      throw new Error('Token verification failed')
    }

    const tokenInfo = await response.json() as TokenInfoResponse

    // Check for error in response
    if (tokenInfo.error_description) {
      throw new Error(tokenInfo.error_description)
    }

    // Validate required fields
    if (!tokenInfo.sub || !tokenInfo.email) {
      throw new Error('Token missing required fields')
    }

    // Validate issuer
    const validIssuers = ['https://accounts.google.com', 'accounts.google.com']
    if (!validIssuers.includes(tokenInfo.iss)) {
      throw new Error('Invalid token issuer')
    }

    // Validate audience (must match our client ID)
    if (tokenInfo.aud !== expectedClientId) {
      throw new Error('Invalid token audience')
    }

    // Expiration is already validated by Google's tokeninfo endpoint
    // If the token is expired, the endpoint returns an error

    return {
      id: tokenInfo.sub,
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email,
      picture: tokenInfo.picture
    }
  } catch (error) {
    throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getUserIdFromToken(token: string, expectedClientId: string): Promise<string> {
  const user = await verifyGoogleToken(token, expectedClientId)
  return user.id
}
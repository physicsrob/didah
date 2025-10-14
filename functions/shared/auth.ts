import { createClerkClient } from '@clerk/backend'
import { User } from './types'

/**
 * Authenticates a request and returns the user ID
 *
 * @param request - The Request object
 * @param secretKey - The Clerk secret key from environment variables
 * @param publishableKey - The Clerk publishable key from environment variables (optional)
 * @returns User ID if authenticated
 * @throws Error if authentication fails
 */
export async function getUserIdFromRequest(request: Request, secretKey: string, publishableKey?: string): Promise<string> {
  const clerkClient = createClerkClient({ secretKey, publishableKey })

  const requestState = await clerkClient.authenticateRequest(request, {
    secretKey,
    publishableKey
  })

  if (!requestState.isAuthenticated) {
    throw new Error(`Authentication failed: ${requestState.reason || 'Unknown reason'}`)
  }

  const auth = requestState.toAuth()

  if (!auth.userId) {
    throw new Error('No user ID in authenticated request')
  }

  return auth.userId
}

/**
 * Verifies a Clerk session token and returns the authenticated user (full user object)
 *
 * @param request - The Request object
 * @param secretKey - The Clerk secret key from environment variables
 * @param publishableKey - The Clerk publishable key from environment variables (optional)
 * @returns User object if token is valid
 * @throws Error if token is invalid or verification fails
 */
export async function verifyClerkToken(request: Request, secretKey: string, publishableKey?: string): Promise<User> {
  const clerkClient = createClerkClient({ secretKey, publishableKey })

  const requestState = await clerkClient.authenticateRequest(request, {
    secretKey,
    publishableKey
  })

  if (!requestState.isAuthenticated) {
    throw new Error(`Authentication failed: ${requestState.reason || 'Unknown reason'}`)
  }

  const auth = requestState.toAuth()

  if (!auth.userId) {
    throw new Error('No user ID in authenticated request')
  }

  // Get full user details from Clerk
  const clerkUser = await clerkClient.users.getUser(auth.userId)

  if (!clerkUser) {
    throw new Error('User not found')
  }

  // Extract email (prefer primary email)
  const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)
  const email = primaryEmail?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress

  if (!email) {
    throw new Error('User has no email address')
  }

  // Map Clerk user to our User type
  return {
    id: clerkUser.id,
    email: email,
    name: clerkUser.fullName || clerkUser.firstName || email,
    picture: clerkUser.imageUrl
  }
}

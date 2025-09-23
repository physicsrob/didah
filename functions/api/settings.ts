import { getUserIdFromToken } from '../shared/auth'
import { validateSettings, DEFAULT_USER_SETTINGS, type UserSettings } from '../shared/types'

interface Env {
  KV: KVNamespace
}

// GET /api/settings
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    // Extract and validate auth token
    const authHeader = context.request.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let userId: string
    try {
      userId = getUserIdFromToken(authHeader)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch settings from KV store
    const key = `user:${userId}:settings`
    let settings: UserSettings

    try {
      const storedSettings = await context.env.KV.get(key, 'json')
      if (storedSettings) {
        settings = storedSettings as UserSettings
      } else {
        // No settings found, return defaults
        settings = DEFAULT_USER_SETTINGS
      }
    } catch (error) {
      console.error('Error fetching settings from KV:', error)
      return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ settings }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error) {
    console.error('Unexpected error in settings GET:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// PUT /api/settings
export async function onRequestPut(context: { request: Request; env: Env }) {
  try {
    // Extract and validate auth token
    const authHeader = context.request.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let userId: string
    try {
      userId = getUserIdFromToken(authHeader)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    let requestData: unknown
    try {
      requestData = await context.request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate settings structure
    if (!requestData || typeof requestData !== 'object' || !('settings' in requestData)) {
      return new Response(JSON.stringify({ error: 'Missing settings in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = requestData as { settings: unknown }
    if (!validateSettings(data.settings)) {
      return new Response(JSON.stringify({ error: 'Invalid settings format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const settings = data.settings as UserSettings

    // Store settings in KV
    const key = `user:${userId}:settings`
    try {
      await context.env.KV.put(key, JSON.stringify(settings))
    } catch (error) {
      console.error('Error storing settings in KV:', error)
      return new Response(JSON.stringify({ error: 'Failed to save settings' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ settings }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error) {
    console.error('Unexpected error in settings PUT:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Handle preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
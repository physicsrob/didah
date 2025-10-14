import type { UserSettings } from './types'

export class SettingsAPI {
  async fetch(): Promise<UserSettings> {
    const response = await fetch('/api/settings', {
      credentials: 'include' // Include cookies for authentication
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed')
      }
      throw new Error(`Failed to fetch settings: ${response.status}`)
    }

    const data = await response.json()
    return data.settings
  }

  async update(settings: UserSettings): Promise<void> {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ settings })
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed')
      }
      if (response.status === 400) {
        throw new Error('Invalid settings format')
      }
      throw new Error(`Failed to update settings: ${response.status}`)
    }
  }
}
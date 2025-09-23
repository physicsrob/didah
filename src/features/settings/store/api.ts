import type { UserSettings } from './types'

export class SettingsAPI {
  private authToken: string

  constructor(authToken: string) {
    this.authToken = authToken
  }

  async fetch(): Promise<UserSettings> {
    const response = await fetch('/api/settings', {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
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
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
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
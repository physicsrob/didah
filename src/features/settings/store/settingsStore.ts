import { SettingsAPI } from './api'
import { DEFAULT_USER_SETTINGS, type UserSettings } from './types'

type SettingsListener = (settings: UserSettings) => void

class SettingsStore {
  private settings: UserSettings | null = null
  private listeners = new Set<SettingsListener>()
  private api: SettingsAPI | null = null
  private syncQueue: Promise<void> = Promise.resolve()
  private isInitialized = false

  async initialize(authToken: string): Promise<void> {
    // Prevent re-initialization with the same token
    if (this.isInitialized && this.api) {
      return
    }

    this.api = new SettingsAPI(authToken)
    this.isInitialized = true

    // 1. Load from cache (non-blocking)
    const cached = this.loadFromCache()
    if (cached) {
      this.settings = cached
      this.notifyListeners()
    }

    // 2. Fetch from backend (authoritative)
    try {
      const remote = await this.api.fetch()
      this.settings = remote
      this.saveToCache(remote)
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      // Use cached or defaults
      if (!this.settings) {
        this.settings = DEFAULT_USER_SETTINGS
        this.saveToCache(this.settings)
        this.notifyListeners()
      }
    }
  }

  async updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ): Promise<void> {
    if (!this.settings) {
      console.warn('Settings not initialized')
      return
    }

    // 1. Optimistic update
    this.settings = { ...this.settings, [key]: value }
    this.saveToCache(this.settings)
    this.notifyListeners()

    // 2. Queue backend sync
    this.queueSync()
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    if (!this.settings) {
      console.warn('Settings not initialized')
      return
    }

    // 1. Optimistic update
    this.settings = { ...this.settings, ...updates }
    this.saveToCache(this.settings)
    this.notifyListeners()

    // 2. Queue backend sync
    this.queueSync()
  }

  private queueSync(): void {
    if (!this.api || !this.settings) {
      return
    }

    // Chain syncs to prevent race conditions
    this.syncQueue = this.syncQueue
      .then(() => this.syncToBackend())
      .catch(error => {
        console.error('Settings sync failed:', error)
        // Could add user notification here
      })
  }

  private async syncToBackend(): Promise<void> {
    if (!this.api || !this.settings) return

    // Retry logic with exponential backoff
    let attempts = 0
    const maxAttempts = 3
    const baseDelay = 1000 // 1 second

    while (attempts < maxAttempts) {
      try {
        await this.api.update(this.settings)
        return // Success
      } catch (error) {
        attempts++
        if (attempts >= maxAttempts) {
          throw error
        }
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempts - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  getSettings(): UserSettings | null {
    return this.settings
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener)
    // Immediately notify with current settings if available
    if (this.settings) {
      listener(this.settings)
    }
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  private loadFromCache(): UserSettings | null {
    try {
      const cached = localStorage.getItem('userSettings')
      if (!cached) return null

      const parsed = JSON.parse(cached)
      // Basic validation that it has expected shape
      if (typeof parsed === 'object' && 'wpm' in parsed) {
        return parsed as UserSettings
      }
      return null
    } catch (error) {
      console.warn('Failed to load settings from cache:', error)
      return null
    }
  }

  private saveToCache(settings: UserSettings): void {
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings to cache:', error)
    }
  }

  private notifyListeners(): void {
    if (!this.settings) return
    this.listeners.forEach(listener => {
      try {
        listener(this.settings!)
      } catch (error) {
        console.error('Settings listener error:', error)
      }
    })
  }

  clear(): void {
    this.settings = null
    this.api = null
    this.isInitialized = false
    this.syncQueue = Promise.resolve()

    try {
      localStorage.removeItem('userSettings')
    } catch (error) {
      console.warn('Failed to clear settings cache:', error)
    }

    // Clear all listeners without notification
    this.listeners.clear()
  }
}

// Export singleton instance
export const settingsStore = new SettingsStore()
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

    try {
      const remote = await this.api.fetch()
      // Merge remote settings with defaults to handle schema evolution
      const cleanRemote = Object.fromEntries(
        Object.entries(remote).filter(([, v]) => v !== undefined)
      )
      this.settings = { ...DEFAULT_USER_SETTINGS, ...cleanRemote }
      this.saveToCache(this.settings)
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to fetch settings:', error)

      // Any error: Fall back to cache or defaults
      const cached = this.loadFromCache()
      this.settings = cached || DEFAULT_USER_SETTINGS
      this.saveToCache(this.settings)
      this.notifyListeners()

      // Re-throw so SettingsProvider can show warning banner
      throw error
    }
  }

  initializeAnonymous(): void {
    // For anonymous users, just use localStorage
    this.api = null
    this.isInitialized = true

    // Load from cache or use defaults
    const cached = this.loadFromCache()
    this.settings = cached || DEFAULT_USER_SETTINGS

    // Save defaults to cache if nothing was cached
    if (!cached) {
      this.saveToCache(this.settings)
    }

    this.notifyListeners()
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
        // Merge with defaults, but filter out undefined values from cached settings
        // so defaults can fill them in
        const cleanParsed = Object.fromEntries(
          Object.entries(parsed).filter(([, v]) => v !== undefined)
        )
        return { ...DEFAULT_USER_SETTINGS, ...cleanParsed } as UserSettings
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
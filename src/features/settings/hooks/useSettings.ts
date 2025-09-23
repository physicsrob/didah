import { useState, useEffect, useCallback } from 'react'
import { settingsStore } from '../store/settingsStore'
import type { UserSettings } from '../store/types'

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(() =>
    settingsStore.getSettings()
  )
  const [isLoading, setIsLoading] = useState(!settings)

  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = settingsStore.subscribe((newSettings) => {
      setSettings(newSettings)
      setIsLoading(false)
    })

    // Get current settings if we don't have them
    const current = settingsStore.getSettings()
    if (current) {
      setSettings(current)
      setIsLoading(false)
    }

    return unsubscribe
  }, [])

  const updateSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      return settingsStore.updateSetting(key, value)
    },
    []
  )

  const updateSettings = useCallback(
    (updates: Partial<UserSettings>) => {
      return settingsStore.updateSettings(updates)
    },
    []
  )

  return {
    settings,
    updateSetting,
    updateSettings,
    isLoading
  }
}
# Settings Architecture Implementation Plan

## Overview

This document outlines the implementation of a centralized settings system with Cloudflare KV backend sync using a write-through cache pattern and a hybrid store/hook architecture.

## Core Architecture

```
Google Auth → KV Store (source of truth)
                ↓
         SettingsStore (manager)
                ↓
         localStorage (cache)
                ↓
         React Hook (UI access)
```

## Key Design Decisions

- **Authentication**: Google OAuth only - no anonymous settings
- **Sync Strategy**: Write-through cache with localStorage mirror
- **Conflict Resolution**: Last-write-wins for simplicity
- **Application Integration**: Hybrid store + React hooks pattern
- **No Offline Support**: Requires authentication and connectivity
- **No Migration**: Clean slate, no legacy user handling
- **No Schema Versioning**: Single current schema

## File Structure

```
/src/features/settings/
  store/
    settingsStore.ts      # Core settings manager class
    types.ts              # Settings types and schemas
    api.ts                # KV API client
  hooks/
    useSettings.ts        # React hook wrapper
  context/
    SettingsProvider.tsx  # React context provider

/functions/api/
  settings/
    get.ts               # GET /api/settings
    update.ts            # PUT /api/settings
```

## Implementation Phases

### Phase 1: Backend API

#### 1.1 Create GET endpoint
**File**: `functions/api/settings/get.ts`
```typescript
export async function onRequestGet(context) {
  // 1. Authenticate via Google token from header
  const token = context.request.headers.get('Authorization')
  const userId = await verifyGoogleToken(token)

  // 2. Fetch from KV
  const key = `user:${userId}:settings`
  const settings = await context.env.KV.get(key, 'json')

  // 3. Return settings or defaults
  return Response.json({
    settings: settings || DEFAULT_USER_SETTINGS
  })
}
```

#### 1.2 Create UPDATE endpoint
**File**: `functions/api/settings/update.ts`
```typescript
export async function onRequestPut(context) {
  // 1. Authenticate
  const userId = await verifyGoogleToken(...)

  // 2. Parse and validate body
  const { settings } = await context.request.json()
  validateSettings(settings)

  // 3. Write to KV
  await context.env.KV.put(
    `user:${userId}:settings`,
    JSON.stringify(settings)
  )

  // 4. Return updated settings
  return Response.json({ settings })
}
```

### Phase 2: Settings Store

#### 2.1 Define Types
**File**: `src/features/settings/store/types.ts`
```typescript
export type UserSettings = {
  // Core settings
  wpm: number
  includeNumbers: boolean
  includeStdPunct: boolean
  includeAdvPunct: boolean

  // Session defaults
  defaultDuration: 60 | 120 | 300
  defaultMode: 'practice' | 'listen' | 'live-copy'
  defaultSpeedTier: 'slow' | 'medium' | 'fast' | 'lightning'
  defaultSourceId: string

  // Active mode settings
  feedback: 'buzzer' | 'flash' | 'both'
  replay: boolean

  // Live copy settings
  liveCopyFeedback: 'end' | 'immediate'
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  wpm: 15,
  includeNumbers: true,
  includeStdPunct: true,
  includeAdvPunct: false,
  defaultDuration: 60,
  defaultMode: 'practice',
  defaultSpeedTier: 'slow',
  defaultSourceId: 'random_letters',
  feedback: 'both',
  replay: true,
  liveCopyFeedback: 'end'
}
```

#### 2.2 Create API Client
**File**: `src/features/settings/store/api.ts`
```typescript
export class SettingsAPI {
  constructor(private authToken: string) {}

  async fetch(): Promise<UserSettings> {
    const response = await fetch('/api/settings', {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    })
    const { settings } = await response.json()
    return settings
  }

  async update(settings: UserSettings): Promise<void> {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ settings })
    })
  }
}
```

#### 2.3 Implement Settings Store
**File**: `src/features/settings/store/settingsStore.ts`
```typescript
class SettingsStore {
  private settings: UserSettings | null = null
  private listeners = new Set<(settings: UserSettings) => void>()
  private api: SettingsAPI | null = null
  private syncQueue: Promise<void> = Promise.resolve()

  async initialize(authToken: string): Promise<void> {
    this.api = new SettingsAPI(authToken)

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
    if (!this.settings) return

    // 1. Optimistic update
    this.settings = { ...this.settings, [key]: value }
    this.saveToCache(this.settings)
    this.notifyListeners()

    // 2. Queue backend sync
    this.queueSync()
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    if (!this.settings) return

    // 1. Optimistic update
    this.settings = { ...this.settings, ...updates }
    this.saveToCache(this.settings)
    this.notifyListeners()

    // 2. Queue backend sync
    this.queueSync()
  }

  private queueSync(): void {
    // Chain syncs to prevent race conditions
    this.syncQueue = this.syncQueue
      .then(() => this.syncToBackend())
      .catch(error => console.error('Settings sync failed:', error))
  }

  private async syncToBackend(): Promise<void> {
    if (!this.api || !this.settings) return

    // Retry logic with exponential backoff
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      try {
        await this.api.update(this.settings)
        return
      } catch (error) {
        attempts++
        if (attempts >= maxAttempts) throw error
        await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000))
      }
    }
  }

  getSettings(): UserSettings | null {
    return this.settings
  }

  subscribe(listener: (settings: UserSettings) => void): () => void {
    this.listeners.add(listener)
    if (this.settings) listener(this.settings)
    return () => this.listeners.delete(listener)
  }

  private loadFromCache(): UserSettings | null {
    try {
      const cached = localStorage.getItem('userSettings')
      return cached ? JSON.parse(cached) : null
    } catch {
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
    this.listeners.forEach(listener => listener(this.settings!))
  }

  clear(): void {
    this.settings = null
    this.api = null
    localStorage.removeItem('userSettings')
    this.notifyListeners()
  }
}

export const settingsStore = new SettingsStore()
```

### Phase 3: React Integration

#### 3.1 Create React Hook
**File**: `src/features/settings/hooks/useSettings.ts`
```typescript
import { useState, useEffect, useCallback } from 'react'
import { settingsStore } from '../store/settingsStore'
import type { UserSettings } from '../store/types'

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(
    () => settingsStore.getSettings()
  )

  useEffect(() => {
    // Subscribe to changes
    return settingsStore.subscribe(setSettings)
  }, [])

  const updateSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      settingsStore.updateSetting(key, value)
    },
    []
  )

  const updateSettings = useCallback(
    (updates: Partial<UserSettings>) => {
      settingsStore.updateSettings(updates)
    },
    []
  )

  return {
    settings,
    updateSetting,
    updateSettings,
    isLoading: !settings
  }
}
```

#### 3.2 Create Settings Provider
**File**: `src/features/settings/context/SettingsProvider.tsx`
```typescript
import { useEffect, useState, ReactNode } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { settingsStore } from '../store/settingsStore'

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { user, token } = useAuth()
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      settingsStore.clear()
      setInitialized(false)
      return
    }

    settingsStore.initialize(token)
      .then(() => setInitialized(true))
      .catch(err => {
        console.error('Failed to initialize settings:', err)
        setError('Failed to load settings')
        setInitialized(true) // Continue with defaults
      })
  }, [token])

  // Show loading state during initial settings fetch
  if (token && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-center">
          <h2 className="heading-2 mb-4">Loading settings...</h2>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

### Phase 4: Migration & Integration

#### 4.1 Update App.tsx
```typescript
import { SettingsProvider } from './features/settings/context/SettingsProvider'

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            {/* existing routes */}
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}
```

#### 4.2 Update SettingsPage.tsx
Replace all localStorage usage with `useSettings()`:
```typescript
import { useSettings } from '../features/settings/hooks/useSettings'

export default function SettingsPage() {
  const { settings, updateSetting } = useSettings()

  if (!settings) return null

  return (
    <div>
      {/* Replace state variables with settings.* */}
      <button onClick={() => updateSetting('feedback', 'buzzer')}>
        Buzzer
      </button>
      {/* etc */}
    </div>
  )
}
```

#### 4.3 Update SessionConfigPage.tsx
Similar migration to use centralized settings:
```typescript
const { settings } = useSettings()

// Use settings for defaults
const [duration] = useState(settings?.defaultDuration || 60)
const [speedTier] = useState(settings?.defaultSpeedTier || 'slow')
// etc
```

#### 4.4 Remove Old localStorage Code
- Delete all direct localStorage calls
- Remove duplicate setting state management
- Clean up redundant useEffect hooks

### Phase 5: Deployment Configuration

#### 5.1 Update wrangler.toml
```toml
[[kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

#### 5.2 Create KV Namespace
```bash
npx wrangler kv:namespace create "morse_settings"
npx wrangler kv:namespace create "morse_settings" --preview
```

## API Specification

### GET /api/settings
```
Request:
  Headers:
    Authorization: Bearer <google_token>

Response:
  200 OK
  {
    "settings": {
      "wpm": 15,
      "includeNumbers": true,
      ...
    }
  }

  401 Unauthorized - Invalid token
  500 Internal Error - KV failure
```

### PUT /api/settings
```
Request:
  Headers:
    Authorization: Bearer <google_token>
    Content-Type: application/json
  Body:
    {
      "settings": { ... }
    }

Response:
  200 OK
  {
    "settings": { ... }
  }

  400 Bad Request - Invalid settings shape
  401 Unauthorized - Invalid token
  500 Internal Error - KV failure
```

## Sync Behavior Details

### On Application Load
1. User logs in with Google
2. SettingsProvider blocks UI with loading state
3. Fetch settings from KV store
4. Override any existing localStorage
5. Render application with settings

### On Setting Change
1. Component calls `updateSetting(key, value)`
2. Store updates memory immediately
3. Store updates localStorage immediately
4. UI re-renders with new value
5. Store queues backend sync (async)
6. Backend sync retries up to 3 times if failed

### On Logout
1. Clear settings from memory
2. Clear localStorage
3. Redirect to login

## Error Handling

- **Initial fetch fails**: Use cached settings or defaults, show toast warning
- **Update sync fails**: Silent retry 3x with exponential backoff
- **Invalid settings from backend**: Log error, use defaults
- **localStorage quota exceeded**: Log error, continue without cache

## Testing Strategy

### Unit Tests
- SettingsStore with mock API
- Settings validation logic
- Cache read/write operations

### Integration Tests
- Full flow: login → fetch → update → sync
- Error scenarios (network failure, invalid token)
- Race conditions (multiple rapid updates)

### Manual Testing Checklist
- [ ] Login and verify settings load
- [ ] Change setting and verify immediate UI update
- [ ] Verify localStorage contains settings
- [ ] Login on second device, verify same settings
- [ ] Change setting on device A, refresh device B
- [ ] Test with slow/failed network

## Implementation Order

1. **Backend Setup**
   - [ ] Create KV namespaces in Cloudflare
   - [ ] Implement backend API endpoints
   - [ ] Test endpoints with curl/Postman

2. **Core Implementation**
   - [ ] Implement SettingsStore
   - [ ] Create React hook and provider
   - [ ] Update App.tsx with provider

3. **Migration & Cleanup**
   - [ ] Migrate SettingsPage.tsx
   - [ ] Migrate SessionConfigPage.tsx
   - [ ] Remove old localStorage code
   - [ ] Test and deploy

## Future Enhancements (Not in MVP)

- Settings import/export
- Settings history/undo
- Per-device overrides
- Offline support with sync queue
- Settings profiles/presets
- Schema versioning and migrations
# Statistics Store Implementation Plan

## Overview

A simplified statistics storage system that mirrors the settings architecture but handles arrays of session statistics organized by day. Provides immediate sync for authenticated users and localStorage-only storage for anonymous users.

## Core Architecture

### Design Principles

1. **Immediate Sync**: Statistics sync to backend immediately when added (no batching)
2. **Day-based Storage**: Each day's statistics stored as a separate array
3. **Write-through Cache**: localStorage serves as cache for backend KV
4. **Simple Append**: Statistics are only added, never modified
5. **Consistency with Settings**: Reuse patterns from settings implementation

## File Structure

```
/src/features/statistics/
  store/
    statsStore.ts       # Core statistics manager class
    statsAPI.ts         # KV API client
    types.ts            # Statistics types
  hooks/
    useStats.ts         # React hook wrapper
  context/
    StatsProvider.tsx   # React context provider

/functions/api/
  stats/
    [date].ts           # GET/PUT /api/stats/[date]
```

## Implementation Components

### 1. Types (`types.ts`)

```typescript
export interface SessionStats {
  timestamp: number
  date: string  // "2024-01-15"
  mode: 'practice' | 'listen' | 'live-copy'
  duration: number
  charactersTransmitted: number
  accuracy: number
  wpm: number
  // ... other stats from sessionStatsCalculator
}

export type DayStats = SessionStats[]
```

### 2. Stats API Client (`statsAPI.ts`)

```typescript
export class StatsAPI {
  constructor(private authToken: string) {}

  async fetchDayStats(date: string): Promise<DayStats> {
    const response = await fetch(`/api/stats/${date}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`)
    }

    const data = await response.json()
    return data.stats || []
  }

  async updateDayStats(date: string, stats: DayStats): Promise<void> {
    const response = await fetch(`/api/stats/${date}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ stats })
    })

    if (!response.ok) {
      throw new Error(`Failed to update stats: ${response.status}`)
    }
  }
}
```

### 3. Stats Store (`statsStore.ts`)

```typescript
class StatsStore {
  private api: StatsAPI | null = null
  private todayStats: DayStats = []
  private todayKey: string = ''
  private listeners = new Set<(stats: DayStats) => void>()
  private syncQueue: Promise<void> = Promise.resolve()

  async initialize(authToken: string): Promise<void> {
    this.api = new StatsAPI(authToken)

    // Load today's stats
    const today = this.getCurrentDateKey()
    this.todayKey = today

    // Try cache first
    const cached = this.loadFromCache(today)
    if (cached) {
      this.todayStats = cached
      this.notifyListeners()
    }

    // Fetch from backend (authoritative)
    try {
      const remote = await this.api.fetchDayStats(today)
      this.todayStats = remote
      this.saveToCache(today, remote)
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      if (!cached) {
        this.todayStats = []
        this.notifyListeners()
      }
    }
  }

  initializeAnonymous(): void {
    this.api = null
    const today = this.getCurrentDateKey()
    this.todayKey = today

    // Load from cache or start empty
    this.todayStats = this.loadFromCache(today) || []
    this.notifyListeners()
  }

  async addSessionStats(stats: SessionStats): Promise<void> {
    // Use the date from the stats object itself
    const date = stats.date

    // Load existing stats for this date
    const existingStats = this.loadFromCache(date) || []

    // Append new stats
    const updatedStats = [...existingStats, stats]
    this.saveToCache(date, updatedStats)

    // Update today's stats if it's today
    if (date === this.todayKey) {
      this.todayStats = updatedStats
      this.notifyListeners()
    }

    // Sync to backend if authenticated
    if (this.api) {
      this.queueSync(date)
    }
  }

  private queueSync(date: string): void {
    if (!this.api) return

    // Chain syncs to prevent race conditions (like settings)
    this.syncQueue = this.syncQueue
      .then(() => this.syncToBackend(date))
      .catch(error => console.error('Stats sync failed:', error))
  }

  private async syncToBackend(date: string): Promise<void> {
    if (!this.api) return

    const stats = date === this.todayKey ? this.todayStats : this.loadFromCache(date)
    if (!stats) return

    // Retry logic with exponential backoff (same as settings)
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      try {
        await this.api.updateDayStats(date, stats)
        return
      } catch (error) {
        attempts++
        if (attempts >= maxAttempts) throw error
        await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000))
      }
    }
  }

  getTodayStats(): DayStats {
    return this.todayStats
  }

  getStatsForDay(date: string): DayStats | null {
    if (date === this.todayKey) {
      return this.todayStats
    }
    return this.loadFromCache(date)
  }

  subscribe(listener: (stats: DayStats) => void): () => void {
    this.listeners.add(listener)
    listener(this.todayStats)
    return () => this.listeners.delete(listener)
  }

  private getCurrentDateKey(): string {
    return new Date().toISOString().split('T')[0]
  }

  private loadFromCache(date: string): DayStats | null {
    try {
      const key = `stats:${date}`
      const cached = localStorage.getItem(key)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  private saveToCache(date: string, stats: DayStats): void {
    try {
      const key = `stats:${date}`
      localStorage.setItem(key, JSON.stringify(stats))
    } catch (error) {
      console.error('Failed to save stats to cache:', error)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.todayStats))
  }

  clear(): void {
    this.api = null
    this.todayStats = []
    this.todayKey = ''
    this.listeners.clear()
  }
}

export const statsStore = new StatsStore()
```

### 4. React Hook (`useStats.ts`)

```typescript
export function useStats() {
  const [todayStats, setTodayStats] = useState<DayStats>(() =>
    statsStore.getTodayStats()
  )

  useEffect(() => {
    return statsStore.subscribe(setTodayStats)
  }, [])

  const addSessionStats = useCallback(
    async (stats: SessionStats) => {
      await statsStore.addSessionStats(stats)
    },
    []
  )

  const getStatsForDay = useCallback(
    (date: string) => statsStore.getStatsForDay(date),
    []
  )

  return {
    todayStats,
    addSessionStats,
    getStatsForDay
  }
}
```

### 5. Stats Provider (`StatsProvider.tsx`)

```typescript
export function StatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const token = user ? localStorage.getItem('google_token') : null

    if (!token) {
      statsStore.initializeAnonymous()
      setInitialized(true)
      return
    }

    statsStore.initialize(token)
      .then(() => setInitialized(true))
      .catch(err => {
        console.error('Failed to initialize stats:', err)
        setInitialized(true) // Continue with cached
      })

    return () => {
      if (!user) {
        // Don't clear stats on logout - keep them local
      }
    }
  }, [user])

  if (user && !initialized) {
    return <div>Loading statistics...</div>
  }

  return <>{children}</>
}
```

### 6. Backend API (`functions/api/stats/[date].ts`)

```typescript
export async function onRequestGet(context) {
  const { date } = context.params
  const userId = getUserIdFromToken(context.request.headers.get('Authorization'))

  const key = `user:${userId}:stats:${date}`
  const stats = await context.env.KV.get(key, 'json')

  return Response.json({
    stats: stats || []
  })
}

export async function onRequestPut(context) {
  const { date } = context.params
  const userId = getUserIdFromToken(context.request.headers.get('Authorization'))
  const { stats } = await context.request.json()

  const key = `user:${userId}:stats:${date}`
  await context.env.KV.put(key, JSON.stringify(stats))

  return Response.json({ success: true })
}
```

## Integration

### Update App.tsx

```typescript
<AuthProvider>
  <SettingsProvider>
    <StatsProvider>
      <AudioProvider>
        {/* routes */}
      </AudioProvider>
    </StatsProvider>
  </SettingsProvider>
</AuthProvider>
```

### Usage in SessionCompletePage

```typescript
import { useStats } from '../features/statistics/hooks/useStats'

function SessionCompletePage() {
  const { addSessionStats } = useStats()
  const stats = useSessionStats() // Existing hook

  useEffect(() => {
    if (stats) {
      addSessionStats({
        ...stats,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now()
      })
    }
  }, [stats])

  // Rest of component...
}
```

## Storage Schema

### localStorage Keys
```
stats:2024-01-15    # Array of SessionStats for Jan 15
stats:2024-01-14    # Array of SessionStats for Jan 14
```

### KV Store Keys
```
user:123:stats:2024-01-15    # User 123's stats for Jan 15
user:123:stats:2024-01-14    # User 123's stats for Jan 14
```

## Key Design Decisions

1. **No Batching**: Stats sync immediately when added, maintaining data consistency
2. **Simple Merge**: Last write wins for entire day array (no complex merging)
3. **Date from Stats**: Use the date field from SessionStats object (no rollover detection)
4. **Anonymous Support**: Full functionality without authentication
5. **Retry Logic**: Same exponential backoff as settings (1s, 2s, 4s)
6. **No Migration**: Anonymous stats remain local (simplicity over features)

## Implementation Order

1. Create types and API client
2. Implement StatsStore with localStorage-only mode
3. Add React hook and provider
4. Integrate into App.tsx
5. Update SessionCompletePage to save stats
6. Implement backend API endpoints
7. Test anonymous → authenticated flow

## Future Enhancements (Not in MVP)

- Stats cleanup (remove old days from localStorage)
- Anonymous → authenticated stats migration
- Offline queue for failed syncs
- Stats aggregation endpoints
- Export functionality
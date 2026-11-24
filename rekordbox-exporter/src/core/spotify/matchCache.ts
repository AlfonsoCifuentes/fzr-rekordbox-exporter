import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { SpotifyMatch } from '../common/types'

type CacheEntry = {
  match: SpotifyMatch
  updatedAt: number
}

const MAX_CACHE_ENTRIES = 5000
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/**
 * Lightweight JSON-backed Spotify match cache stored in Electron userData.
 * Zero native bindings, fast lookups, survives app restarts.
 */
export class MatchCache {
  private entries = new Map<string, CacheEntry>()
  private dirty = false

  constructor(private readonly filePath: string) {
    this.load()
  }

  private load(): void {
    try {
      if (!existsSync(this.filePath)) return
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>
      const now = Date.now()
      for (const [k, v] of Object.entries(parsed)) {
        if (v && v.match && now - v.updatedAt < TTL_MS) {
          this.entries.set(k, v)
        }
      }
    } catch {
      // Corrupt or unreadable cache — start fresh
      this.entries.clear()
    }
  }

  get(fingerprint: string): SpotifyMatch | undefined {
    const entry = this.entries.get(fingerprint)
    if (!entry) return undefined
    if (Date.now() - entry.updatedAt >= TTL_MS) {
      this.entries.delete(fingerprint)
      this.dirty = true
      return undefined
    }
    return entry.match
  }

  set(fingerprint: string, match: SpotifyMatch): void {
    this.entries.set(fingerprint, { match, updatedAt: Date.now() })
    this.dirty = true

    // Prune oldest entries if over limit
    if (this.entries.size > MAX_CACHE_ENTRIES) {
      const sorted = Array.from(this.entries.entries()).sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      const toRemove = sorted.length - MAX_CACHE_ENTRIES
      for (let i = 0; i < toRemove; i++) {
        this.entries.delete(sorted[i][0])
      }
    }
  }

  clear(): void {
    this.entries.clear()
    this.dirty = true
    this.flush()
  }

  size(): number {
    return this.entries.size
  }

  flush(): void {
    if (!this.dirty) return
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      const obj: Record<string, CacheEntry> = {}
      for (const [k, v] of this.entries.entries()) {
        obj[k] = v
      }
      writeFileSync(this.filePath, JSON.stringify(obj), 'utf-8')
      this.dirty = false
    } catch {
      // non-critical
    }
  }
}

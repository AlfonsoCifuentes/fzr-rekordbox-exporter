import type { Track, Playlist, SpotifyMatch, SpotifyCandidate } from '../common/types'
import {
  type RawSpotifyTrack,
  buildSearchQueries,
  classifyMatch,
  scoreCandidate,
  buildTrackFingerprint
} from './matchTracks'
import type { MatchCache } from './matchCache'

const API_BASE = 'https://api.spotify.com/v1'
const MAX_RETRIES = 4

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Operación cancelada por el usuario'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new Error('Operación cancelada por el usuario'))
      },
      { once: true }
    )
  })
}

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
  signal?: AbortSignal
): Promise<T> {
  let attempt = 0

  while (true) {
    if (signal?.aborted) {
      throw new Error('Operación cancelada por el usuario')
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined)
      }
    })

    // Handle Spotify 429 Too Many Requests with Retry-After header
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterSec = parseInt(res.headers.get('Retry-After') ?? '2', 10)
      const waitMs = (isNaN(retryAfterSec) ? 2 : Math.max(1, retryAfterSec)) * 1000 + 250
      attempt++
      await sleep(waitMs, signal)
      continue
    }

    // Retry transient 5xx server errors with exponential backoff
    if (res.status >= 500 && res.status < 600 && attempt < MAX_RETRIES) {
      attempt++
      await sleep(Math.min(8000, 500 * Math.pow(2, attempt)), signal)
      continue
    }

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Spotify API ${res.status} en ${path}: ${text}`)
    }

    if (res.status === 204) {
      return {} as T
    }

    return res.json() as Promise<T>
  }
}

export interface SpotifyUser {
  id: string
  display_name: string
}

export async function getCurrentUser(token: string): Promise<SpotifyUser> {
  return apiFetch<SpotifyUser>('/me', token)
}

export async function searchSpotifyTracks(
  query: string,
  token: string,
  limit = 6,
  signal?: AbortSignal
): Promise<RawSpotifyTrack[]> {
  if (!query.trim()) return []
  const data = await apiFetch<{
    tracks?: { items?: RawSpotifyTrack[] }
  }>(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, token, {}, signal)

  return data?.tracks?.items ?? []
}

/**
 * Run the multi-query waterfall for a single Rekordbox track and return a scored SpotifyMatch.
 */
export async function matchSingleTrack(
  track: Track,
  token: string,
  signal?: AbortSignal
): Promise<SpotifyMatch> {
  const queries = buildSearchQueries(track)
  if (queries.length === 0) {
    return classifyMatch(track, [])
  }

  const collected: RawSpotifyTrack[] = []
  let bestQueryUsed = queries[0]

  for (const q of queries) {
    if (signal?.aborted) {
      throw new Error('Operación cancelada por el usuario')
    }
    try {
      const items = await searchSpotifyTracks(q, token, 5, signal)
      if (items.length > 0) {
        collected.push(...items)
        const tentative = classifyMatch(track, collected, q)
        bestQueryUsed = q
        // Short-circuit early when we already have a very confident match!
        if (tentative.confidence >= 88) {
          return tentative
        }
      }
    } catch (err) {
      if (signal?.aborted) throw err
      // Continue to next query on non-fatal search error
    }
  }

  return classifyMatch(track, collected, bestQueryUsed)
}

/**
 * Manual search from the Review screen: returns scored candidates for a user-edited query.
 */
export async function searchManualCandidates(
  query: string,
  track: Track,
  token: string
): Promise<SpotifyCandidate[]> {
  const items = await searchSpotifyTracks(query, token, 8)
  return items.map((item) => scoreCandidate(track, item)).sort((a, b) => b.score - a.score)
}

export interface SpotifyExportProgress {
  stage: 'creating' | 'searching' | 'adding' | 'done'
  current: number
  total: number
  matched: number
  ambiguous: number
  notFound: number
  currentTrack?: string
}

export interface SpotifyExportResult {
  playlistUrl: string
  matched: number
  notFound: number
  unmatchedTracks: Array<{ artist: string; name: string }>
}

/**
 * Match every track in a playlist against Spotify (using local cache when available).
 */
export async function matchPlaylistTracks(
  playlist: Playlist,
  token: string,
  options: {
    cache?: MatchCache
    onProgress?: (p: SpotifyExportProgress) => void
    signal?: AbortSignal
  } = {}
): Promise<SpotifyMatch[]> {
  const { cache, onProgress, signal } = options
  const total = playlist.tracks.length
  const matches: SpotifyMatch[] = []
  let matched = 0
  let ambiguous = 0
  let notFound = 0

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      throw new Error('Búsqueda cancelada por el usuario')
    }

    const track = playlist.tracks[i]
    const fp = buildTrackFingerprint(track)
    let match: SpotifyMatch | undefined

    const cached = cache?.get(fp)
    if (cached) {
      match = {
        ...cached,
        sourceTrackId: track.internalId,
        sourceTitle: track.name,
        sourceArtist: track.artist,
        sourceDurationSeconds: track.durationSeconds
      }
    } else {
      match = await matchSingleTrack(track, token, signal)
      if (cache && match.status !== 'not_found') {
        cache.set(fp, match)
      }
    }

    matches.push(match)
    if (match.status === 'matched' || match.status === 'manual') matched++
    else if (match.status === 'ambiguous') ambiguous++
    else notFound++

    onProgress?.({
      stage: 'searching',
      current: i + 1,
      total,
      matched,
      ambiguous,
      notFound,
      currentTrack: `${track.artist} - ${track.name}`
    })
  }

  cache?.flush()
  return matches
}

/**
 * Create a Spotify playlist from reviewed SpotifyMatch[] entries.
 */
export async function createSpotifyPlaylistFromMatches(
  playlistName: string,
  matches: SpotifyMatch[],
  token: string,
  options: {
    isPublic?: boolean
    customDescription?: string
    onProgress?: (p: SpotifyExportProgress) => void
    signal?: AbortSignal
  } = {}
): Promise<SpotifyExportResult> {
  const { isPublic = false, customDescription, onProgress, signal } = options

  const selectedUris: string[] = []
  const unmatchedTracks: Array<{ artist: string; name: string }> = []

  for (const m of matches) {
    if (!m.excluded && m.spotifyUri && (m.status === 'matched' || m.status === 'manual' || m.status === 'ambiguous')) {
      selectedUris.push(m.spotifyUri)
    } else {
      unmatchedTracks.push({ artist: m.sourceArtist, name: m.sourceTitle })
    }
  }

  onProgress?.({
    stage: 'creating',
    current: 0,
    total: matches.length,
    matched: selectedUris.length,
    ambiguous: 0,
    notFound: unmatchedTracks.length
  })

  const description =
    customDescription ??
    `Exportado desde Rekordbox con FZR Rekordbox Exporter · ${selectedUris.length}/${matches.length} tracks encontrados.`

  // Modern Spotify API uses POST /me/playlists; fall back to /users/{id}/playlists if needed
  let created: { id: string; external_urls: { spotify: string } }
  try {
    created = await apiFetch<{ id: string; external_urls: { spotify: string } }>(
      '/me/playlists',
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          name: playlistName,
          description,
          public: isPublic
        })
      },
      signal
    )
  } catch {
    const user = await getCurrentUser(token)
    created = await apiFetch<{ id: string; external_urls: { spotify: string } }>(
      `/users/${encodeURIComponent(user.id)}/playlists`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          name: playlistName,
          description,
          public: isPublic
        })
      },
      signal
    )
  }

  const playlistId = created.id
  const playlistUrl = created.external_urls.spotify

  // Add tracks in batches of 100 (Spotify Web API limit) preserving exact order
  for (let i = 0; i < selectedUris.length; i += 100) {
    if (signal?.aborted) {
      throw new Error('Exportación cancelada por el usuario')
    }
    const batch = selectedUris.slice(i, i + 100)
    await apiFetch(
      `/playlists/${playlistId}/tracks`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ uris: batch })
      },
      signal
    )
    onProgress?.({
      stage: 'adding',
      current: Math.min(i + 100, selectedUris.length),
      total: selectedUris.length,
      matched: selectedUris.length,
      ambiguous: 0,
      notFound: unmatchedTracks.length
    })
  }

  onProgress?.({
    stage: 'done',
    current: matches.length,
    total: matches.length,
    matched: selectedUris.length,
    ambiguous: 0,
    notFound: unmatchedTracks.length
  })

  return {
    playlistUrl,
    matched: selectedUris.length,
    notFound: unmatchedTracks.length,
    unmatchedTracks
  }
}

/**
 * Convenience one-shot helper: match + create playlist directly.
 */
export async function exportPlaylistToSpotify(
  playlist: Playlist,
  token: string,
  onProgress: (p: SpotifyExportProgress) => void,
  options: { isPublic?: boolean; cache?: MatchCache; signal?: AbortSignal } = {}
): Promise<SpotifyExportResult> {
  const matches = await matchPlaylistTracks(playlist, token, {
    cache: options.cache,
    onProgress,
    signal: options.signal
  })

  return createSpotifyPlaylistFromMatches(playlist.name, matches, token, {
    isPublic: options.isPublic ?? false,
    onProgress,
    signal: options.signal
  })
}

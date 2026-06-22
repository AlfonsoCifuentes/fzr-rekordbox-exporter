import type { Track, Playlist } from '../common/types'

const API_BASE = 'https://api.spotify.com/v1'

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined)
    }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Spotify API ${res.status} en ${path}: ${text}`)
  }
  return res.json() as Promise<T>
}

export interface SpotifyUser {
  id: string
  display_name: string
}

export async function getCurrentUser(token: string): Promise<SpotifyUser> {
  return apiFetch<SpotifyUser>('/me', token)
}

async function searchTrackUri(track: Track, token: string): Promise<string | null> {
  // Remove special characters that break Spotify field filters
  const clean = (s: string): string => s.replace(/['"()[\]{}]/g, '').trim()
  const title = clean(track.name)
  const artist = clean(track.artist)

  if (!title || !artist) return null

  const q = `track:${title} artist:${artist}`

  try {
    const data = await apiFetch<{
      tracks: { items: Array<{ uri: string; name: string }> }
    }>(`/search?q=${encodeURIComponent(q)}&type=track&limit=1`, token)

    return data?.tracks?.items?.[0]?.uri ?? null
  } catch {
    return null
  }
}

export interface SpotifyExportProgress {
  stage: 'creating' | 'searching' | 'adding' | 'done'
  current: number
  total: number
  matched: number
  notFound: number
}

export interface SpotifyExportResult {
  playlistUrl: string
  matched: number
  notFound: number
}

export async function exportPlaylistToSpotify(
  playlist: Playlist,
  token: string,
  onProgress: (p: SpotifyExportProgress) => void
): Promise<SpotifyExportResult> {
  const user = await getCurrentUser(token)

  onProgress({ stage: 'creating', current: 0, total: playlist.tracks.length, matched: 0, notFound: 0 })

  // Create the empty playlist
  const created = await apiFetch<{ id: string; external_urls: { spotify: string } }>(
    `/users/${encodeURIComponent(user.id)}/playlists`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        name: playlist.name,
        description: 'Exportado desde Rekordbox · FZR Rekordbox Exporter',
        public: false
      })
    }
  )

  const playlistId = created.id
  const playlistUrl = created.external_urls.spotify

  // Search each track
  const uris: string[] = []
  let notFound = 0
  const total = playlist.tracks.length

  for (let i = 0; i < total; i++) {
    const uri = await searchTrackUri(playlist.tracks[i], token)
    if (uri) {
      uris.push(uri)
    } else {
      notFound++
    }
    onProgress({ stage: 'searching', current: i + 1, total, matched: uris.length, notFound })
  }

  // Add tracks in batches of 100 (Spotify API limit)
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100)
    await apiFetch(`/playlists/${playlistId}/tracks`, token, {
      method: 'POST',
      body: JSON.stringify({ uris: batch })
    })
    onProgress({ stage: 'adding', current: Math.min(i + 100, uris.length), total: uris.length, matched: uris.length, notFound })
  }

  onProgress({ stage: 'done', current: total, total, matched: uris.length, notFound })

  return { playlistUrl, matched: uris.length, notFound }
}

import type { ParseResult, Playlist, Track } from '../common/types'

/**
 * Extract a 22-char Spotify playlist ID from a URL, spotify: URI, or raw ID.
 */
export function extractSpotifyPlaylistId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:embed\/)?playlist\/([A-Za-z0-9]{22})/)
  if (urlMatch) return urlMatch[1]

  const uriMatch = trimmed.match(/spotify:playlist:([A-Za-z0-9]{22})/)
  if (uriMatch) return uriMatch[1]

  if (/^[A-Za-z0-9]{22}$/.test(trimmed)) return trimmed
  return null
}

type EmbedTrackEntry = {
  title?: string
  name?: string
  subtitle?: string
  artists?: Array<{ name?: string }>
  duration?: number
  duration_ms?: number
  uri?: string
}

/**
 * Parse tracks & playlist title from Spotify's public embed HTML (`__NEXT_DATA__`).
 * Works without OAuth, API keys, or Selenium — inspired by FZR Autopilot's fetch_spotify.py.
 */
export function parseSpotifyEmbedHtml(html: string, playlistId: string): ParseResult {
  const warnings: string[] = []
  let playlistName = `Spotify_${playlistId}`
  let rawTracks: EmbedTrackEntry[] = []

  // Strategy 1: parse <script id="__NEXT_DATA__" type="application/json">...</script>
  const nextDataMatch = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  )
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1]) as Record<string, unknown>
      const entity = (
        (json?.props as Record<string, unknown>)?.pageProps as Record<string, unknown>
      )?.state as Record<string, unknown> | undefined
      const dataEntity = (entity?.data as Record<string, unknown>)?.entity as
        | Record<string, unknown>
        | undefined

      if (dataEntity) {
        if (typeof dataEntity.name === 'string' && dataEntity.name.trim()) {
          playlistName = dataEntity.name.trim()
        } else if (typeof dataEntity.title === 'string' && dataEntity.title.trim()) {
          playlistName = dataEntity.title.trim()
        }

        if (Array.isArray(dataEntity.trackList)) {
          rawTracks = dataEntity.trackList as EmbedTrackEntry[]
        }
      }
    } catch (err) {
      warnings.push(`No se pudo parsear __NEXT_DATA__: ${(err as Error).message}`)
    }
  }

  // Strategy 2: fallback regex extraction for "trackList":[...]
  if (rawTracks.length === 0) {
    const listMatch = html.match(/"trackList"\s*:\s*(\[[\s\S]*?\])\s*[,}]/)
    if (listMatch) {
      try {
        const parsed = JSON.parse(listMatch[1]) as EmbedTrackEntry[]
        if (Array.isArray(parsed)) rawTracks = parsed
      } catch {
        warnings.push('No se pudo extraer trackList del HTML embebido de Spotify.')
      }
    }
  }

  if (rawTracks.length === 0) {
    throw new Error(
      'No se encontraron pistas en la URL de Spotify. Asegúrate de que la playlist sea pública.'
    )
  }

  const tracks: Track[] = rawTracks
    .map((entry, idx): Track | null => {
      const name = (entry.title ?? entry.name ?? '').trim()
      if (!name) return null

      let artist = ''
      if (typeof entry.subtitle === 'string' && entry.subtitle.trim()) {
        // Spotify embed uses non-breaking spaces around commas sometimes
        artist = entry.subtitle.replace(/\u00a0/g, ' ').trim()
      } else if (Array.isArray(entry.artists)) {
        artist = entry.artists
          .map((a) => a?.name?.trim())
          .filter(Boolean)
          .join(', ')
      }

      const rawDur = entry.duration ?? entry.duration_ms
      const durationSeconds =
        typeof rawDur === 'number' && rawDur > 0
          ? rawDur > 10000
            ? Math.round(rawDur / 1000)
            : Math.round(rawDur)
          : undefined

      return {
        internalId: `sp-${playlistId}-${idx + 1}`,
        name,
        artist: artist || 'Unknown Artist',
        durationSeconds
      }
    })
    .filter((t): t is Track => t !== null)

  if (tracks.length >= 100) {
    warnings.push(
      'La vista pública embebida de Spotify devuelve hasta 100 pistas. Para playlists mayores puedes exportarlas a CSV (Exportify) o importarlas desde Rekordbox/Traktor.'
    )
  }

  const playlist: Playlist = {
    id: `spotify-${playlistId}`,
    name: playlistName,
    path: ['Spotify', playlistName],
    tracks
  }

  return {
    tracks,
    playlists: [playlist],
    warnings
  }
}

/**
 * Fetch a public Spotify playlist directly from its share URL or ID (no OAuth required).
 */
export async function fetchPublicSpotifyPlaylist(
  urlOrId: string,
  fetchFn: typeof fetch = fetch
): Promise<{ filePath: string; parseResult: ParseResult }> {
  const playlistId = extractSpotifyPlaylistId(urlOrId)
  if (!playlistId) {
    throw new Error(
      'URL de Spotify inválida. Ejemplo: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM3M'
    )
  }

  const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`
  const res = await fetchFn(embedUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml'
    }
  })

  if (!res.ok) {
    throw new Error(
      `Spotify devolvió HTTP ${res.status}. Verifica que la playlist exista y sea pública.`
    )
  }

  const html = await res.text()
  const parseResult = parseSpotifyEmbedHtml(html, playlistId)
  return {
    filePath: `spotify://playlist/${playlistId}`,
    parseResult
  }
}

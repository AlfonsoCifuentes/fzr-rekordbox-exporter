import { randomUUID } from 'crypto'
import type { ParseResult, Track, Playlist } from '../common/types'
import { decodeFileUri, stripBom } from '../common/filePaths'

/**
 * Parse an M3U8 / M3U file exported from Rekordbox.
 *
 * Rekordbox M3U8 format:
 *   #EXTM3U
 *   #EXTINF:360,Artist Name - Track Title
 *   C:\Music\Artist\Track.mp3
 *
 * Also handles UTF-8 BOM, #EXTALB, #EXTGENRE, and file:// / file://localhost/ URIs.
 */
export function parseRekordboxM3u8(
  content: string,
  sourceFileName: string
): ParseResult {
  const warnings: string[] = []
  const cleaned = stripBom(content)
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (!lines[0]?.startsWith('#EXTM3U')) {
    warnings.push('El archivo no comienza con #EXTM3U — puede no ser un M3U8 válido')
  }

  const tracks: Track[] = []
  let pendingDuration: number | undefined
  let pendingDisplayName: string | undefined
  let pendingAlbum: string | undefined
  let pendingGenre: string | undefined

  for (const line of lines) {
    if (line.startsWith('#EXTM3U')) {
      continue
    }

    if (line.startsWith('#PLAYLIST:')) {
      continue
    }

    if (line.startsWith('#EXTINF:')) {
      const rest = line.slice('#EXTINF:'.length)
      const commaIdx = rest.indexOf(',')
      if (commaIdx >= 0) {
        const durStr = rest.slice(0, commaIdx).trim()
        const dur = parseFloat(durStr)
        // Rekordbox uses -1 for unknown duration
        pendingDuration = isNaN(dur) || dur < 0 ? undefined : dur
        pendingDisplayName = rest.slice(commaIdx + 1).trim()
      }
      continue
    }

    if (line.startsWith('#EXTALB:')) {
      pendingAlbum = line.slice('#EXTALB:'.length).trim() || undefined
      continue
    }

    if (line.startsWith('#EXTGENRE:')) {
      pendingGenre = line.slice('#EXTGENRE:'.length).trim() || undefined
      continue
    }

    if (line.startsWith('#')) {
      continue
    }

    // This line is a file path (or file:// URI)
    const location = decodeFileUri(line) ?? line

    const { name, artist } = parseDisplayName(pendingDisplayName, location)

    if (!name) {
      warnings.push(`Pista sin título en M3U8: ${location || '(ruta vacía)'}`)
    }

    const track: Track = {
      internalId: randomUUID(),
      name: name || '(sin título)',
      artist: artist || '(artista desconocido)',
      album: pendingAlbum,
      genre: pendingGenre,
      durationSeconds: pendingDuration,
      location: location || undefined
    }

    tracks.push(track)

    // Reset pending state
    pendingDuration = undefined
    pendingDisplayName = undefined
    pendingAlbum = undefined
    pendingGenre = undefined
  }

  if (tracks.length === 0) {
    warnings.push('No se encontraron pistas en el archivo M3U8')
  }

  // Derive playlist name from filename (strip extension)
  const playlistName = sourceFileName.replace(/\.[^.]+$/, '') || 'Playlist importada'

  const playlist: Playlist = {
    id: randomUUID(),
    name: playlistName,
    path: [playlistName],
    tracks
  }

  return { tracks, playlists: [playlist], warnings }
}

/**
 * Try to split a Rekordbox display name "Artist - Title" into components.
 * If no separator found, treat the whole string as the title.
 */
function parseDisplayName(
  displayName: string | undefined,
  location: string
): { name: string; artist: string } {
  if (!displayName) {
    const filename = location.split(/[\\/]/).pop() ?? ''
    const nameOnly = filename.replace(/\.[^.]+$/, '')
    const dashIdx = nameOnly.indexOf(' - ')
    if (dashIdx > 0) {
      return {
        artist: nameOnly.slice(0, dashIdx).trim(),
        name: nameOnly.slice(dashIdx + 3).trim()
      }
    }
    return { name: nameOnly, artist: '' }
  }

  const dashIdx = displayName.indexOf(' - ')
  if (dashIdx > 0) {
    return {
      artist: displayName.slice(0, dashIdx).trim(),
      name: displayName.slice(dashIdx + 3).trim()
    }
  }

  return { name: displayName, artist: '' }
}

import { randomUUID } from 'crypto'
import type { ParseResult, Track, Playlist } from '../common/types'

/**
 * Parse a TXT file exported from Rekordbox.
 *
 * Rekordbox exports a tab-separated file with a header row on the first line.
 * The exact column set varies by version, but common columns include:
 *
 *   #  Track Title  Artist  Composer  Album  Grouping  Genre  Kind  Size
 *   Total Time  Disc #  Track #  Year  Date Added  Bit Rate  Sample Rate
 *   Comments  Play Count  Last Played  Rating  Location  Remixer  Tonality
 *   Label  Original Artist  Mix Name  Color  BPM  Date Released  Track Type
 *
 * The parser reads the header to build a dynamic column map, so it tolerates
 * missing or reordered columns between Rekordbox versions.
 *
 * The playlist name is derived from `sourceFileName`.
 */
export function parseRekordboxTxt(
  content: string,
  sourceFileName: string
): ParseResult {
  const warnings: string[] = []

  // Normalize line endings
  const lines = content.split(/\r?\n/)

  // Find header row (first non-empty line)
  let headerIdx = 0
  while (headerIdx < lines.length && lines[headerIdx].trim() === '') headerIdx++

  if (headerIdx >= lines.length) {
    throw new Error('El archivo TXT está vacío')
  }

  const headerLine = lines[headerIdx]

  // Detect separator: Rekordbox uses tab, but some locales export with semicolon
  const separator = headerLine.includes('\t') ? '\t' : ';'
  const headers = headerLine.split(separator).map((h) => h.trim().toLowerCase())

  if (headers.length < 2) {
    throw new Error(
      'No se pudo detectar el formato del TXT de Rekordbox. ' +
        'Comprueba que el archivo es una exportación de Rekordbox (columnas separadas por tabulaciones).'
    )
  }

  // Build column index map
  const col = (name: string): number => headers.indexOf(name)

  // Key column names used by Rekordbox (case-insensitive)
  const COL_TITLE = col('track title') !== -1 ? col('track title') : col('title')
  const COL_ARTIST = col('artist')
  const COL_ALBUM = col('album')
  const COL_GENRE = col('genre')
  const COL_TOTAL_TIME = col('total time') !== -1 ? col('total time') : col('duration')
  const COL_YEAR = col('year')
  const COL_BITRATE = col('bit rate') !== -1 ? col('bit rate') : col('bitrate')
  const COL_SAMPLERATE = col('sample rate') !== -1 ? col('sample rate') : col('samplerate')
  const COL_COMMENTS = col('comments')
  const COL_RATING = col('rating')
  const COL_LOCATION = col('location')
  const COL_REMIXER = col('remixer')
  const COL_KEY = col('tonality') !== -1 ? col('tonality') : col('key')
  const COL_BPM = col('bpm')
  const COL_MIX = col('mix name') !== -1 ? col('mix name') : col('mix')
  const COL_SIZE = col('size')

  if (COL_TITLE === -1) {
    warnings.push(
      'No se encontró la columna "Track Title" en el TXT. ' +
        'Es posible que el archivo no sea una exportación de Rekordbox.'
    )
  }

  const tracks: Track[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const cells = line.split(separator)

    const get = (colIdx: number): string =>
      colIdx >= 0 && colIdx < cells.length ? cells[colIdx].trim() : ''

    const name = get(COL_TITLE)
    const artist = get(COL_ARTIST)

    if (!name && !artist) {
      // Likely an empty/summary row at end of file
      continue
    }

    if (!name) {
      warnings.push(`Fila ${i + 1}: pista sin título`)
    }

    const location = get(COL_LOCATION) || undefined

    const track: Track = {
      internalId: randomUUID(),
      name: name || '(sin título)',
      artist: artist || '(artista desconocido)',
      album: get(COL_ALBUM) || undefined,
      genre: get(COL_GENRE) || undefined,
      remixer: get(COL_REMIXER) || undefined,
      mix: get(COL_MIX) || undefined,
      key: get(COL_KEY) || undefined,
      durationSeconds: parseTotalTime(get(COL_TOTAL_TIME)),
      year: parseIntOrUndefined(get(COL_YEAR)),
      bpm: parseFloatOrUndefined(get(COL_BPM)),
      bitrate: parseBitrate(get(COL_BITRATE)),
      sampleRate: parseSampleRate(get(COL_SAMPLERATE)),
      fileSize: parseFileSize(get(COL_SIZE)),
      rating: parseRating(get(COL_RATING)),
      comments: get(COL_COMMENTS) || undefined,
      location
    }

    tracks.push(track)
  }

  if (tracks.length === 0) {
    warnings.push('No se encontraron pistas en el archivo TXT')
  }

  const playlistName = sourceFileName.replace(/\.[^.]+$/, '') || 'Playlist importada'

  const playlist: Playlist = {
    id: randomUUID(),
    name: playlistName,
    path: [playlistName],
    tracks
  }

  return { tracks, playlists: [playlist], warnings }
}

// ---- Helpers -------------------------------------------------------------

/**
 * Parse Rekordbox "Total Time" field.
 * Formats seen: "6:00", "1:30:00", "360"
 */
function parseTotalTime(value: string): number | undefined {
  if (!value) return undefined
  const parts = value.split(':')
  if (parts.length === 1) {
    const n = parseFloat(parts[0])
    return isNaN(n) ? undefined : n
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10)
    const s = parseInt(parts[1], 10)
    if (isNaN(m) || isNaN(s)) return undefined
    return m * 60 + s
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    const s = parseInt(parts[2], 10)
    if (isNaN(h) || isNaN(m) || isNaN(s)) return undefined
    return h * 3600 + m * 60 + s
  }
  return undefined
}

/**
 * Parse Rekordbox "Bit Rate" field.
 * Formats seen: "320kbps", "320", "320 kbps"
 */
function parseBitrate(value: string): number | undefined {
  if (!value) return undefined
  const n = parseInt(value.replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? undefined : n
}

/**
 * Parse Rekordbox "Sample Rate" field.
 * Formats seen: "44100", "44100 Hz", "44.1 kHz"
 */
function parseSampleRate(value: string): number | undefined {
  if (!value) return undefined
  if (value.toLowerCase().includes('khz')) {
    const n = parseFloat(value)
    return isNaN(n) ? undefined : Math.round(n * 1000)
  }
  const n = parseInt(value.replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? undefined : n
}

/**
 * Parse Rekordbox "Size" field.
 * Formats seen: "8.3 MB", "8300000", "8.3MB"
 * Returns bytes.
 */
function parseFileSize(value: string): number | undefined {
  if (!value) return undefined
  const lower = value.toLowerCase()
  const n = parseFloat(value)
  if (isNaN(n)) return undefined
  if (lower.includes('gb')) return Math.round(n * 1_000_000_000)
  if (lower.includes('mb')) return Math.round(n * 1_000_000)
  if (lower.includes('kb')) return Math.round(n * 1_000)
  return Math.round(n)
}

/**
 * Parse Rekordbox star rating.
 * Formats seen: "★★★★★" (1–5 stars), "5", "0"
 */
function parseRating(value: string): number | undefined {
  if (!value) return undefined
  // Count star characters
  const stars = (value.match(/★/g) ?? []).length
  if (stars > 0) return stars
  const n = parseInt(value, 10)
  return isNaN(n) ? undefined : n
}

function parseIntOrUndefined(value: string): number | undefined {
  if (!value) return undefined
  const n = parseInt(value, 10)
  return isNaN(n) ? undefined : n
}

function parseFloatOrUndefined(value: string): number | undefined {
  if (!value) return undefined
  const n = parseFloat(value)
  return isNaN(n) ? undefined : n
}

import { randomUUID } from 'crypto'
import type { ParseResult, Track, Playlist } from '../common/types'
import { decodeFileUri, stripBom } from '../common/filePaths'

/**
 * Parse a TXT file exported from Rekordbox (English or Spanish headers, tab or semicolon separated).
 *
 * Rekordbox exports a tab-separated file (often UTF-16 LE, decoded before passing here)
 * with a header row on the first line.
 */
export function parseRekordboxTxt(
  content: string,
  sourceFileName: string
): ParseResult {
  const warnings: string[] = []
  const cleaned = stripBom(content)

  // Normalize line endings
  const lines = cleaned.split(/\r?\n/)

  // Find header row (first non-empty line)
  let headerIdx = 0
  while (headerIdx < lines.length && lines[headerIdx].trim() === '') headerIdx++

  if (headerIdx >= lines.length) {
    throw new Error('El archivo TXT está vacío')
  }

  const headerLine = lines[headerIdx]

  // Detect separator: Rekordbox uses tab, some locales export with semicolon
  const separator = headerLine.includes('\t') ? '\t' : ';'
  const headers = headerLine
    .split(separator)
    .map((h) => unquote(h).trim().toLowerCase())

  if (headers.length < 2) {
    throw new Error(
      'No se pudo detectar el formato del TXT de Rekordbox. ' +
        'Comprueba que el archivo es una exportación de Rekordbox (columnas separadas por tabulaciones).'
    )
  }

  // Helper that matches multiple localized/versioned Rekordbox column names
  const findCol = (...names: string[]): number => {
    for (const n of names) {
      const idx = headers.indexOf(n)
      if (idx !== -1) return idx
    }
    return -1
  }

  const COL_TITLE = findCol('track title', 'title', 'título de pista', 'titulo de pista', 'título', 'titulo', 'nombre')
  const COL_ARTIST = findCol('artist', 'artista')
  const COL_ALBUM = findCol('album', 'álbum')
  const COL_GENRE = findCol('genre', 'género', 'genero')
  const COL_TOTAL_TIME = findCol('total time', 'duration', 'time', 'tiempo', 'duración', 'duracion')
  const COL_YEAR = findCol('year', 'año', 'ano')
  const COL_BITRATE = findCol('bit rate', 'bitrate', 'tasa de bits')
  const COL_SAMPLERATE = findCol('sample rate', 'samplerate', 'frecuencia de muestreo')
  const COL_COMMENTS = findCol('comments', 'comentarios')
  const COL_RATING = findCol('rating', 'clasificación', 'clasificacion')
  const COL_LOCATION = findCol('location', 'ubicación', 'ubicacion', 'ruta')
  const COL_REMIXER = findCol('remixer', 'remezclador')
  const COL_KEY = findCol('tonality', 'key', 'tonalidad', 'clave')
  const COL_BPM = findCol('bpm')
  const COL_MIX = findCol('mix name', 'mix', 'nombre de mezcla')
  const COL_SIZE = findCol('size', 'tamaño', 'tamano')
  const COL_LABEL = findCol('label', 'sello')
  const COL_DATE_ADDED = findCol('date added', 'fecha añadida', 'fecha anadida')

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
      colIdx >= 0 && colIdx < cells.length ? unquote(cells[colIdx]).trim() : ''

    const name = get(COL_TITLE)
    const artist = get(COL_ARTIST)

    if (!name && !artist) {
      continue
    }

    if (!name) {
      warnings.push(`Fila ${i + 1}: pista sin título`)
    }

    const rawLoc = get(COL_LOCATION)
    const location = rawLoc ? decodeFileUri(rawLoc) : undefined

    const track: Track = {
      internalId: randomUUID(),
      name: name || '(sin título)',
      artist: artist || '(artista desconocido)',
      album: get(COL_ALBUM) || undefined,
      genre: get(COL_GENRE) || undefined,
      label: get(COL_LABEL) || undefined,
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
      dateAdded: get(COL_DATE_ADDED) || undefined,
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

function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"')
  }
  return trimmed
}

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

function parseBitrate(value: string): number | undefined {
  if (!value) return undefined
  const n = parseInt(value.replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? undefined : n
}

function parseSampleRate(value: string): number | undefined {
  if (!value) return undefined
  if (value.toLowerCase().includes('khz')) {
    const n = parseFloat(value.replace(',', '.'))
    return isNaN(n) ? undefined : Math.round(n * 1000)
  }
  const n = parseInt(value.replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? undefined : n
}

function parseFileSize(value: string): number | undefined {
  if (!value) return undefined
  const lower = value.toLowerCase()
  const n = parseFloat(value.replace(',', '.'))
  if (isNaN(n)) return undefined
  if (lower.includes('gb')) return Math.round(n * 1_000_000_000)
  if (lower.includes('mb')) return Math.round(n * 1_000_000)
  if (lower.includes('kb')) return Math.round(n * 1_000)
  return Math.round(n)
}

function parseRating(value: string): number | undefined {
  if (!value) return undefined
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
  const n = parseFloat(value.replace(',', '.'))
  return isNaN(n) ? undefined : n
}

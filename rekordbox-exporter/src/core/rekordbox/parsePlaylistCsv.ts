import { randomUUID } from 'crypto'
import type { ParseResult, Track, Playlist } from '../common/types'
import { stripBom, decodeFileUri } from '../common/filePaths'

/**
 * Parse a CSV playlist (Exportify, Soundiiz, TuneMyMusic, Apple Music, or FZR streaming CSV).
 * Supports RFC-4180 quoted values, comma or semicolon delimiters, and millisecond/second durations.
 */
export function parsePlaylistCsv(content: string, sourceFileName: string): ParseResult {
  const warnings: string[] = []
  const cleaned = stripBom(content)
  const rows = parseCsvRows(cleaned)

  if (rows.length === 0) {
    throw new Error('El archivo CSV está vacío')
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase())
  if (headers.length < 2) {
    throw new Error('El archivo CSV no contiene suficientes columnas válidas')
  }

  const findCol = (...names: string[]): number => {
    for (const n of names) {
      const idx = headers.indexOf(n)
      if (idx !== -1) return idx
    }
    return -1
  }

  const COL_TITLE = findCol('track name', 'title', 'track title', 'name', 'song', 'título', 'titulo')
  const COL_ARTIST = findCol('artist name(s)', 'artist name', 'artist', 'artists', 'artista', 'artistas')
  const COL_ALBUM = findCol('album name', 'album', 'álbum')
  const COL_GENRE = findCol('genres', 'genre', 'género', 'genero')
  const COL_BPM = findCol('tempo', 'bpm')
  const COL_KEY = findCol('key', 'tonality', 'tonalidad')
  const COL_DUR_MS = findCol('duration (ms)', 'duration_ms', 'track duration (ms)')
  const COL_DUR_S = findCol('duration_seconds', 'duration_s', 'duration', 'total time', 'duración')
  const COL_YEAR = findCol('release date', 'album release date', 'year', 'año')
  const COL_LOC = findCol('location', 'path', 'file', 'ubicación')
  const COL_LABEL = findCol('record label', 'label', 'sello')

  if (COL_TITLE === -1) {
    warnings.push('No se encontró columna de título estándar (title / track name) en el CSV')
  }

  const tracks: Track[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const get = (idx: number): string => (idx >= 0 && idx < row.length ? row[idx].trim() : '')

    const name = get(COL_TITLE)
    // Exportify separates multiple artists with semicolons inside quotes: "Artist A;Artist B"
    const rawArtist = get(COL_ARTIST).replace(/;/g, ', ')
    if (!name && !rawArtist) continue

    let durationSeconds: number | undefined
    const msStr = get(COL_DUR_MS)
    if (msStr) {
      const ms = parseFloat(msStr)
      if (!isNaN(ms) && ms > 0) durationSeconds = Math.round(ms / 1000)
    } else {
      const sStr = get(COL_DUR_S)
      if (sStr) durationSeconds = parseDurationFlexible(sStr)
    }

    const bpmRaw = parseFloat(get(COL_BPM).replace(',', '.'))
    const bpm = !isNaN(bpmRaw) && bpmRaw > 0 ? Math.round(bpmRaw * 100) / 100 : undefined

    const yearMatch = get(COL_YEAR).match(/(\d{4})/)
    const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined

    const rawLoc = get(COL_LOC)
    const location = rawLoc ? decodeFileUri(rawLoc) : undefined

    tracks.push({
      internalId: randomUUID(),
      name: name || '(sin título)',
      artist: rawArtist || '(artista desconocido)',
      album: get(COL_ALBUM) || undefined,
      genre: get(COL_GENRE).split(',')[0]?.trim() || undefined,
      label: get(COL_LABEL) || undefined,
      bpm,
      key: get(COL_KEY) || undefined,
      durationSeconds,
      year,
      location
    })
  }

  if (tracks.length === 0) {
    warnings.push('No se encontraron pistas en el archivo CSV')
  }

  const playlistName = sourceFileName.replace(/\.[^.]+$/, '') || 'CSV Import'
  const playlist: Playlist = {
    id: randomUUID(),
    name: playlistName,
    path: [playlistName],
    tracks
  }

  return { tracks, playlists: [playlist], warnings }
}

/**
 * RFC-4180 CSV parser supporting quoted fields with embedded commas/newlines and auto-detected delimiter.
 */
function parseCsvRows(input: string): string[][] {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? ''
  // Count unquoted commas vs semicolons on header line
  const commas = (firstLine.match(/,/g) ?? []).length
  const semis = (firstLine.match(/;/g) ?? []).length
  const delimiter = semis > commas ? ';' : ','

  const rows: string[][] = []
  let currentRow: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    const next = input[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        currentRow.push(field)
        field = ''
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(field)
        if (currentRow.some((c) => c.trim() !== '')) rows.push(currentRow)
        currentRow = []
        field = ''
        i++
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(field)
        if (currentRow.some((c) => c.trim() !== '')) rows.push(currentRow)
        currentRow = []
        field = ''
      } else {
        field += ch
      }
    }
  }

  currentRow.push(field)
  if (currentRow.some((c) => c.trim() !== '')) {
    rows.push(currentRow)
  }

  return rows
}

function parseDurationFlexible(val: string): number | undefined {
  if (val.includes(':')) {
    const parts = val.split(':').map((p) => parseInt(p, 10))
    if (parts.some(isNaN)) return undefined
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return undefined
  }
  const n = parseFloat(val)
  if (isNaN(n) || n <= 0) return undefined
  // Heuristic: values > 10000 are almost certainly milliseconds
  return n > 10000 ? Math.round(n / 1000) : Math.round(n)
}

import { XMLParser } from 'fast-xml-parser'
import { randomUUID } from 'crypto'
import type { ParseResult, Track, Playlist, CuePoint } from '../common/types'
import { stripBom } from '../common/filePaths'

/**
 * Reverse mapping from Traktor MUSICAL_KEY VALUE (0..23) to Camelot notation.
 */
const TRAKTOR_KEY_TO_CAMELOT: Record<number, string> = {
  0: '8B', 1: '3B', 2: '10B', 3: '5B', 4: '12B', 5: '7B',
  6: '2B', 7: '9B', 8: '4B', 9: '11B', 10: '6B', 11: '1B',
  12: '5A', 13: '12A', 14: '7A', 15: '2A', 16: '9A', 17: '4A',
  18: '11A', 19: '6A', 20: '1A', 21: '8A', 22: '3A', 23: '10A'
}

type NmlObj = Record<string, unknown>

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return []
  return Array.isArray(val) ? val : [val]
}

function parseNum(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined
  const n = Number(val)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Reconstruct a local file path from Traktor NML LOCATION attributes.
 * Example: VOLUME="C:", DIR="/:Music/:Artist/:", FILE="Track.mp3"
 *   -> "C:/Music/Artist/Track.mp3"
 */
export function traktorLocationToPath(
  volume: string | undefined,
  dir: string | undefined,
  file: string | undefined
): string | undefined {
  if (!file) return undefined
  const cleanDir = (dir ?? '/:')
    .split('/:')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/')

  const vol = (volume ?? '').trim()
  if (/^[A-Za-z]:$/.test(vol)) {
    return cleanDir ? `${vol}/${cleanDir}/${file}` : `${vol}/${file}`
  }
  if (vol && vol !== 'Macintosh HD') {
    return cleanDir ? `/Volumes/${vol}/${cleanDir}/${file}` : `/Volumes/${vol}/${file}`
  }
  return cleanDir ? `/${cleanDir}/${file}` : `/${file}`
}

function parseNmlCuePoints(rawCues: unknown): CuePoint[] | undefined {
  const cues = toArray(rawCues as NmlObj | NmlObj[] | undefined)
  if (cues.length === 0) return undefined

  const result: CuePoint[] = []
  for (const c of cues) {
    const startMs = parseNum(c['START'])
    if (startMs === undefined) continue
    const traktorType = parseNum(c['TYPE']) ?? 0
    // Skip pure BeatGrid markers (TYPE=4) when exporting general cue points? Keep Cue(0), FadeIn(1), FadeOut(2), Load(3), Loop(5->4)
    if (traktorType === 4) continue
    const rbType = traktorType === 5 ? 4 : traktorType
    const lenMs = parseNum(c['LEN']) ?? 0
    const hotcue = parseNum(c['HOTCUE'])

    result.push({
      name: c['NAME'] ? String(c['NAME']) : undefined,
      type: rbType,
      startMs: Math.round(startMs),
      endMs: rbType === 4 && lenMs > 0 ? Math.round(startMs + lenMs) : undefined,
      hotCueIndex: hotcue !== undefined ? hotcue : -1
    })
  }
  return result.length > 0 ? result : undefined
}

function walkNmlNode(
  node: NmlObj,
  parentPath: string[],
  trackByKey: Map<string, Track>,
  playlists: Playlist[],
  warnings: string[]
): void {
  const type = String(node['TYPE'] ?? '').toUpperCase()
  const name = String(node['NAME'] ?? 'Unnamed')
  const currentPath = name === '$ROOT' ? parentPath : [...parentPath, name]

  if (type === 'FOLDER') {
    const subnodes = node['SUBNODES'] as NmlObj | undefined
    const children = toArray((subnodes?.['NODE'] ?? node['NODE']) as NmlObj | NmlObj[] | undefined)
    for (const child of children) {
      walkNmlNode(child, currentPath, trackByKey, playlists, warnings)
    }
  } else if (type === 'PLAYLIST') {
    const plNode = node['PLAYLIST'] as NmlObj | undefined
    const entries = toArray(plNode?.['ENTRY'] as NmlObj | NmlObj[] | undefined)
    const directKeys = toArray(plNode?.['PRIMARYKEY'] as NmlObj | NmlObj[] | undefined)

    const tracks: Track[] = []

    // Traktor NML stores <ENTRY><PRIMARYKEY TYPE="TRACK" KEY="..."/></ENTRY> or direct <PRIMARYKEY .../>
    const keys: string[] = []
    for (const entry of entries) {
      const pk = entry['PRIMARYKEY'] as NmlObj | undefined
      if (pk?.['KEY']) keys.push(String(pk['KEY']))
    }
    for (const pk of directKeys) {
      if (pk?.['KEY']) keys.push(String(pk['KEY']))
    }

    for (const key of keys) {
      const track = trackByKey.get(key) ?? trackByKey.get(key.toLowerCase())
      if (track) {
        tracks.push(track)
      } else {
        warnings.push(`Playlist "${name}": track "${key}" no encontrado en COLLECTION`)
      }
    }

    playlists.push({
      id: randomUUID(),
      name,
      path: currentPath.length > 0 ? currentPath : [name],
      tracks
    })
  }
}

/**
 * Parse a Traktor Pro .nml file into the neutral FZR ParseResult model.
 * Supports collections, nested folders, playlists, BPM, Open Key -> Camelot, and CUE_V2 cue points.
 */
export function parseTraktorNml(nmlContent: string, sourceFileName = 'Traktor.nml'): ParseResult {
  const warnings: string[] = []
  const cleaned = stripBom(nmlContent)

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    parseTagValue: false,
    isArray: (name) => ['ENTRY', 'NODE', 'CUE_V2', 'PRIMARYKEY'].includes(name)
  })

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(cleaned)
  } catch (err) {
    throw new Error(`Archivo NML inválido: ${(err as Error).message}`)
  }

  const root = parsed['NML'] as NmlObj | undefined
  if (!root) {
    throw new Error('El archivo no es un Traktor NML válido (falta etiqueta <NML>)')
  }

  const collection = root['COLLECTION'] as NmlObj | undefined
  const rawEntries = toArray(collection?.['ENTRY'] as NmlObj | NmlObj[] | undefined)

  const tracks: Track[] = []
  const trackByKey = new Map<string, Track>()

  for (const entry of rawEntries) {
    const loc = entry['LOCATION'] as NmlObj | undefined
    const info = entry['INFO'] as NmlObj | undefined
    const album = entry['ALBUM'] as NmlObj | undefined
    const tempo = entry['TEMPO'] as NmlObj | undefined
    const musicalKey = entry['MUSICAL_KEY'] as NmlObj | undefined

    const volume = loc?.['VOLUME'] ? String(loc['VOLUME']) : ''
    const dir = loc?.['DIR'] ? String(loc['DIR']) : ''
    const file = loc?.['FILE'] ? String(loc['FILE']) : ''
    const primaryKey = `${volume}${dir}${file}`
    const location = traktorLocationToPath(volume, dir, file)

    const title = entry['TITLE'] ? String(entry['TITLE']).trim() : ''
    const artist = entry['ARTIST'] ? String(entry['ARTIST']).trim() : ''

    const keyNum = parseNum(musicalKey?.['VALUE'])
    const key =
      (info?.['KEY'] ? String(info['KEY']) : undefined) ??
      (keyNum !== undefined ? TRAKTOR_KEY_TO_CAMELOT[keyNum] : undefined)

    const rawBitrate = parseNum(info?.['BITRATE'])
    const bitrateKbps =
      rawBitrate !== undefined
        ? rawBitrate >= 10000
          ? Math.round(rawBitrate / 1000)
          : rawBitrate
        : undefined

    const rawSizeKb = parseNum(info?.['FILESIZE'])
    const fileSizeBytes = rawSizeKb !== undefined ? rawSizeKb * 1024 : undefined

    const rawRanking = parseNum(info?.['RANKING'])
    const ratingStars =
      rawRanking !== undefined && rawRanking > 0
        ? Math.min(5, Math.max(1, Math.round(rawRanking / 51)))
        : undefined

    const releaseDate = info?.['RELEASE_DATE'] ? String(info['RELEASE_DATE']) : ''
    const yearMatch = releaseDate.match(/^(\d{4})/)
    const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined

    const track: Track = {
      internalId: randomUUID(),
      name: title || (file ? file.replace(/\.[^.]+$/, '') : '(sin título)'),
      artist: artist || '(artista desconocido)',
      album: album?.['TITLE'] ? String(album['TITLE']) : undefined,
      genre: info?.['GENRE'] ? String(info['GENRE']) : undefined,
      label: info?.['LABEL'] ? String(info['LABEL']) : undefined,
      comments: info?.['COMMENT'] ? String(info['COMMENT']) : undefined,
      bpm: parseNum(tempo?.['BPM']),
      key,
      year,
      rating: ratingStars,
      bitrate: bitrateKbps,
      fileSize: fileSizeBytes,
      durationSeconds: parseNum(info?.['PLAYTIME_FLOAT']) ?? parseNum(info?.['PLAYTIME']),
      location,
      cuePoints: parseNmlCuePoints(entry['CUE_V2'])
    }

    tracks.push(track)
    if (primaryKey) {
      trackByKey.set(primaryKey, track)
      trackByKey.set(primaryKey.toLowerCase(), track)
    }
  }

  const playlists: Playlist[] = []
  const playlistsRoot = root['PLAYLISTS'] as NmlObj | undefined
  const rootNodes = toArray(playlistsRoot?.['NODE'] as NmlObj | NmlObj[] | undefined)

  for (const node of rootNodes) {
    walkNmlNode(node, [], trackByKey, playlists, warnings)
  }

  // If the NML had tracks in COLLECTION but no PLAYLISTS section, expose the collection as a single playlist
  if (playlists.length === 0 && tracks.length > 0) {
    const baseName = sourceFileName.replace(/\.[^.]+$/, '') || 'Traktor Collection'
    playlists.push({
      id: randomUUID(),
      name: baseName,
      path: [baseName],
      tracks
    })
  }

  return { tracks, playlists, warnings }
}

import { XMLParser } from 'fast-xml-parser'
import { randomUUID } from 'crypto'
import type { ParseResult, Track, Playlist, CuePoint } from '../common/types'
import { normalizeText } from '../common/normalizeText'
import { decodeFileUri, stripBom } from '../common/filePaths'

// ---- Types mirroring Rekordbox XML structure ----------------------------

type RbPositionMark = Record<string, string | undefined>
type RbTrackAttr = Record<string, string | RbPositionMark | RbPositionMark[] | undefined>

interface RbNode {
  Name?: string
  Type?: string
  Count?: string
  Entries?: string
  KeyType?: string
  TRACK?: Array<{ Key?: string }> | { Key?: string }
  NODE?: RbNode | RbNode[]
}

// ---- Helpers -------------------------------------------------------------

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return []
  return Array.isArray(val) ? val : [val]
}

function parseNumberAttr(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined
  const n = Number(val)
  return Number.isFinite(n) ? n : undefined
}

function parseCuePoints(rawMarks: unknown): CuePoint[] | undefined {
  const marks = toArray(rawMarks as RbPositionMark | RbPositionMark[] | undefined)
  if (marks.length === 0) return undefined

  const cues: CuePoint[] = []
  for (const m of marks) {
    const startSec = parseNumberAttr(m['Start'])
    if (startSec === undefined) continue

    const endSec = parseNumberAttr(m['End'])
    const type = parseNumberAttr(m['Type']) ?? 0
    const num = parseNumberAttr(m['Num'])
    const r = parseNumberAttr(m['Red'])
    const g = parseNumberAttr(m['Green'])
    const b = parseNumberAttr(m['Blue'])

    cues.push({
      name: m['Name'] ? String(m['Name']) : undefined,
      type,
      startMs: Math.round(startSec * 1000),
      endMs: endSec !== undefined ? Math.round(endSec * 1000) : undefined,
      hotCueIndex: num !== undefined ? num : -1,
      color: r !== undefined && g !== undefined && b !== undefined ? { r, g, b } : undefined
    })
  }

  return cues.length > 0 ? cues : undefined
}

// ---- Playlist node walker ------------------------------------------------

function walkNode(
  node: RbNode,
  parentPath: string[],
  trackById: Map<string, Track>,
  trackByLocation: Map<string, Track>,
  playlists: Playlist[],
  warnings: string[]
): void {
  const name = node['Name'] ?? 'Unnamed'
  const type = Number(node['Type'])
  const keyType = Number(node['KeyType'] ?? 0) // 0 = TrackID, 1 = Location URI
  const currentPath = [...parentPath, name]

  if (type === 0) {
    // Folder — recurse into children
    const children = toArray(node.NODE)
    for (const child of children) {
      walkNode(child, currentPath, trackById, trackByLocation, playlists, warnings)
    }
  } else if (type === 1) {
    // Playlist — collect tracks in original order
    const trackRefs = toArray(node.TRACK)
    const tracks: Track[] = []
    for (const ref of trackRefs) {
      const key = String(ref['Key'] ?? '')
      let track: Track | undefined

      if (keyType === 1) {
        // Key is Location URI
        const decodedKey = decodeFileUri(key)
        track =
          trackByLocation.get(key) ??
          (decodedKey ? trackByLocation.get(decodedKey.toLowerCase()) : undefined)
      } else {
        track = trackById.get(key)
      }

      if (track) {
        tracks.push(track)
      } else {
        warnings.push(`Playlist "${name}": track ID ${key} not found in collection`)
      }
    }
    playlists.push({
      id: randomUUID(),
      name,
      path: currentPath,
      tracks
    })
  }
}

// ---- Main parser ---------------------------------------------------------

export function parseRekordboxXml(xmlContent: string): ParseResult {
  const warnings: string[] = []
  const cleanedXml = stripBom(xmlContent)

  // 1. Parse XML (parseAttributeValue: false prevents corrupting numeric titles like "1999" or IDs like "001")
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    parseTagValue: false,
    isArray: (name) => ['NODE', 'TRACK', 'POSITION_MARK'].includes(name)
  })

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(cleanedXml)
  } catch (err) {
    throw new Error(`XML inválido: ${(err as Error).message}`)
  }

  // 2. Validate root
  const root = parsed['DJ_PLAYLISTS'] as Record<string, unknown> | undefined
  if (!root) {
    throw new Error('El archivo no es un XML de Rekordbox válido (falta DJ_PLAYLISTS)')
  }

  // 3. Parse COLLECTION/TRACK
  const collection = root['COLLECTION'] as Record<string, unknown> | undefined
  if (!collection) {
    warnings.push('No se encontró COLLECTION en el XML')
  }

  const rawTracks = toArray(
    (collection?.['TRACK'] ?? []) as RbTrackAttr | RbTrackAttr[]
  )

  if (rawTracks.length === 0) {
    warnings.push('La colección no contiene tracks')
  }

  const trackById = new Map<string, Track>()
  const trackByLocation = new Map<string, Track>()
  const tracks: Track[] = []

  for (const rt of rawTracks) {
    const id = String(rt['TrackID'] ?? '')
    const name = String(rt['Name'] ?? '')
    const artist = String(rt['Artist'] ?? '')

    if (!name) {
      warnings.push(`Track ID ${id}: sin título`)
    }
    if (!artist) {
      warnings.push(`Track ID ${id} ("${name}"): sin artista`)
    }

    const rawLocation = rt['Location'] as string | undefined
    const location = decodeFileUri(rawLocation)
    if (!location) {
      warnings.push(`Track ID ${id} ("${name}"): sin ruta de archivo`)
    }

    const bitrateRaw = rt['BitRate'] ?? rt['Bitrate']
    const cuePoints = parseCuePoints(rt['POSITION_MARK'])

    const track: Track = {
      internalId: randomUUID(),
      rekordboxTrackId: id || undefined,
      name: normalizeText(name) !== '' ? name : name.trim() || '(sin título)',
      artist: artist.trim() || '(artista desconocido)',
      album: rt['Album'] ? String(rt['Album']) : undefined,
      remixer: rt['Remixer'] ? String(rt['Remixer']) : undefined,
      mix: rt['Mix'] ? String(rt['Mix']) : undefined,
      genre: rt['Genre'] ? String(rt['Genre']) : undefined,
      label: rt['Label'] ? String(rt['Label']) : undefined,
      composer: rt['Composer'] ? String(rt['Composer']) : undefined,
      year: parseNumberAttr(rt['Year']),
      bpm: parseNumberAttr(rt['AverageBpm']),
      key: rt['Tonality'] ? String(rt['Tonality']) : undefined,
      durationSeconds: parseNumberAttr(rt['TotalTime']),
      location,
      comments: rt['Comments'] ? String(rt['Comments']) : undefined,
      rating: parseNumberAttr(rt['Rating']),
      dateAdded: rt['DateAdded'] ? String(rt['DateAdded']) : undefined,
      fileSize: parseNumberAttr(rt['Size']),
      bitrate: parseNumberAttr(bitrateRaw),
      sampleRate: parseNumberAttr(rt['SampleRate']),
      cuePoints
    }

    if (id) trackById.set(id, track)
    if (rawLocation) trackByLocation.set(rawLocation, track)
    if (location) trackByLocation.set(location.toLowerCase(), track)
    tracks.push(track)
  }

  // 4. Parse PLAYLISTS
  const playlistsRoot = root['PLAYLISTS'] as Record<string, unknown> | undefined
  if (!playlistsRoot) {
    warnings.push('No se encontraron PLAYLISTS en el XML')
    return { tracks, playlists: [], warnings }
  }

  const rootNode = playlistsRoot['NODE'] as RbNode | RbNode[] | undefined
  if (!rootNode) {
    warnings.push('La sección PLAYLISTS está vacía')
    return { tracks, playlists: [], warnings }
  }

  const playlists: Playlist[] = []
  const rootNodes = toArray(rootNode)
  for (const node of rootNodes) {
    walkNode(node, [], trackById, trackByLocation, playlists, warnings)
  }

  if (playlists.length === 0) {
    warnings.push('No se encontraron playlists en el XML')
  }

  return { tracks, playlists, warnings }
}

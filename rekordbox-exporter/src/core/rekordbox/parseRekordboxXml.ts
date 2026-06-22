import { XMLParser } from 'fast-xml-parser'
import type { ParseResult, Track, Playlist } from '../common/types'
import { normalizeText } from '../common/normalizeText'
import { randomUUID } from 'crypto'

// ---- Types mirroring Rekordbox XML structure ----------------------------
// Using no attributeNamePrefix so attributes are accessed directly by name.

type RbTrackAttr = Record<string, string | number | undefined>

interface RbNode {
  Name: string
  Type: string | number // 0 = folder, 1 = playlist
  Count?: number
  Entries?: number
  KeyType?: number
  TRACK?: Array<{ Key: string | number }> | { Key: string | number }
  NODE?: RbNodeArray
}

type RbNodeArray = RbNode | RbNode[]

// ---- Helpers -------------------------------------------------------------

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return []
  return Array.isArray(val) ? val : [val]
}

/**
 * Convert Rekordbox Location URI to a local file path.
 * Rekordbox stores paths as file:///Volumes/... on Mac or
 * file:///C:/... on Windows.
 */
function locationToPath(location: string | undefined): string | undefined {
  if (!location) return undefined
  try {
    // Replace file:// with nothing and decode URI
    const raw = location.replace(/^file:\/\//, '')
    const decoded = decodeURIComponent(raw)
    // On Windows, remove leading slash before drive letter: /C:/Music -> C:/Music
    return decoded.replace(/^\/([A-Za-z]:)/, '$1')
  } catch {
    return location
  }
}

// ---- Playlist node walker ------------------------------------------------

function walkNode(
  node: RbNode,
  parentPath: string[],
  trackIndex: Map<string, Track>,
  playlists: Playlist[],
  warnings: string[]
): void {
  const name = node['Name'] ?? 'Unnamed'
  const type = Number(node['Type'])
  const currentPath = [...parentPath, name]

  if (type === 0) {
    // Folder — recurse into children
    const children = toArray(node.NODE)
    for (const child of children) {
      walkNode(child, currentPath, trackIndex, playlists, warnings)
    }
  } else if (type === 1) {
    // Playlist — collect tracks
    const trackRefs = toArray(node.TRACK)
    const tracks: Track[] = []
    for (const ref of trackRefs) {
      const key = String(ref['Key'])
      const track = trackIndex.get(key)
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

  // 1. Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (name) => ['NODE', 'TRACK'].includes(name)
  })

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(xmlContent)
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

  const trackIndex = new Map<string, Track>()
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

    const location = locationToPath(rt['Location'] as string | undefined)
    if (!location) {
      warnings.push(`Track ID ${id} ("${name}"): sin ruta de archivo`)
    }

    const track: Track = {
      internalId: randomUUID(),
      rekordboxTrackId: id,
      name: normalizeText(name) !== '' ? name : '(sin título)',
      artist: artist || '(artista desconocido)',
      album: rt['Album'] ? String(rt['Album']) : undefined,
      remixer: rt['Remixer'] ? String(rt['Remixer']) : undefined,
      mix: rt['Mix'] ? String(rt['Mix']) : undefined,
      genre: rt['Genre'] ? String(rt['Genre']) : undefined,
      year: rt['Year'] ? Number(rt['Year']) : undefined,
      bpm: rt['AverageBpm'] ? Number(rt['AverageBpm']) : undefined,
      key: rt['Tonality'] ? String(rt['Tonality']) : undefined,
      durationSeconds: rt['TotalTime'] ? Number(rt['TotalTime']) : undefined,
      location,
      comments: rt['Comments'] ? String(rt['Comments']) : undefined,
      rating: rt['Rating'] ? Number(rt['Rating']) : undefined,
      dateAdded: rt['DateAdded'] ? String(rt['DateAdded']) : undefined,
      fileSize: rt['Size'] ? Number(rt['Size']) : undefined,
      bitrate: rt['BitRate'] ? Number(rt['BitRate']) : undefined,
      sampleRate: rt['SampleRate'] ? Number(rt['SampleRate']) : undefined
    }

    trackIndex.set(id, track)
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
    walkNode(node, [], trackIndex, playlists, warnings)
  }

  if (playlists.length === 0) {
    warnings.push('No se encontraron playlists en el XML')
  }

  return { tracks, playlists, warnings }
}

import { XMLParser } from 'fast-xml-parser'
import { randomUUID } from 'crypto'
import type { ParseResult, Track, Playlist, CuePoint } from '../common/types'
import { stripBom } from '../common/filePaths'

type VdjObj = Record<string, unknown>

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
 * Parse a VirtualDJ XML database (`database.xml`) or `.vdjfolder` XML file.
 *
 * VirtualDJ stores BPM in `<Scan Bpm="0.461538" />` (seconds-per-beat = 60 / BPM)
 * OR directly in `<Tags Bpm="130" />`, and Hot Cues / Loops in `<Poi Type="cue" Pos="..." Num="..." />`.
 */
export function parseVirtualDjXml(xmlContent: string, sourceFileName = 'VirtualDJ.xml'): ParseResult {
  const warnings: string[] = []
  const cleaned = stripBom(xmlContent)

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    parseTagValue: false,
    isArray: (name) => ['Song', 'Poi', 'VirtualFolder', 'FilterFolder'].includes(name)
  })

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(cleaned)
  } catch (err) {
    throw new Error(`XML de VirtualDJ inválido: ${(err as Error).message}`)
  }

  const root = (parsed['VirtualDJ_Database'] ?? parsed['VirtualFolder']) as VdjObj | undefined
  if (!root) {
    throw new Error('El archivo no es un XML de VirtualDJ válido (falta VirtualDJ_Database o VirtualFolder)')
  }

  const rawSongs = toArray(root['Song'] as VdjObj | VdjObj[] | undefined)
  const tracks: Track[] = []

  for (const s of rawSongs) {
    const filePath = s['FilePath'] ? String(s['FilePath']).replace(/\\/g, '/') : undefined
    const tags = s['Tags'] as VdjObj | undefined
    const infos = s['Infos'] as VdjObj | undefined
    const scan = s['Scan'] as VdjObj | undefined
    const pois = toArray(s['Poi'] as VdjObj | VdjObj[] | undefined)

    const fallbackFile = filePath?.split('/').pop()?.replace(/\.[^.]+$/, '') ?? ''
    const title = (tags?.['Title'] ? String(tags['Title']).trim() : '') || fallbackFile || '(sin título)'
    const artist = (tags?.['Author'] ? String(tags['Author']).trim() : '') || '(artista desconocido)'

    // VirtualDJ Scan/@Bpm is seconds-per-beat (e.g. 0.4615 -> 130 BPM)
    let bpm: number | undefined
    const tagBpm = parseNum(tags?.['Bpm'])
    const scanSpb = parseNum(scan?.['Bpm'])
    if (tagBpm && tagBpm > 20) {
      bpm = Math.round(tagBpm * 100) / 100
    } else if (scanSpb && scanSpb > 0.1 && scanSpb < 3) {
      bpm = Math.round((60 / scanSpb) * 100) / 100
    }

    const cuePoints: CuePoint[] = []
    for (const poi of pois) {
      const poiType = String(poi['Type'] ?? '').toLowerCase()
      const posSec = parseNum(poi['Pos'])
      if (posSec === undefined) continue
      if (poiType === 'cue' || poiType === 'loop' || poiType === 'remix') {
        const sizeSec = parseNum(poi['Size'])
        const num = parseNum(poi['Num'])
        const isLoop = poiType === 'loop' || (sizeSec !== undefined && sizeSec > 0)
        cuePoints.push({
          name: poi['Name'] ? String(poi['Name']) : undefined,
          type: isLoop ? 4 : 0,
          startMs: Math.round(posSec * 1000),
          endMs: isLoop && sizeSec ? Math.round((posSec + sizeSec) * 1000) : undefined,
          hotCueIndex: num !== undefined ? Math.max(-1, num - 1) : -1
        })
      }
    }

    tracks.push({
      internalId: randomUUID(),
      name: title,
      artist,
      album: tags?.['Album'] ? String(tags['Album']) : undefined,
      genre: tags?.['Genre'] ? String(tags['Genre']) : undefined,
      remixer: tags?.['Remix'] ? String(tags['Remix']) : undefined,
      label: tags?.['Label'] ? String(tags['Label']) : undefined,
      comments: tags?.['Comment'] ? String(tags['Comment']) : undefined,
      year: parseNum(tags?.['Year']),
      rating: parseNum(tags?.['Stars']),
      bpm,
      key: (scan?.['Key'] ? String(scan['Key']) : undefined) ?? (tags?.['Key'] ? String(tags['Key']) : undefined),
      durationSeconds: parseNum(infos?.['SongLength']),
      bitrate: parseNum(infos?.['Bitrate']),
      fileSize: parseNum(s['FileSize']),
      location: filePath,
      cuePoints: cuePoints.length > 0 ? cuePoints : undefined
    })
  }

  if (tracks.length === 0) {
    warnings.push('No se encontraron canciones en el XML de VirtualDJ')
  }

  const playlistName = sourceFileName.replace(/\.[^.]+$/, '') || 'VirtualDJ Library'
  const playlist: Playlist = {
    id: randomUUID(),
    name: playlistName,
    path: [playlistName],
    tracks
  }

  return { tracks, playlists: [playlist], warnings }
}

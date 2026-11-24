import { randomUUID } from 'crypto'
import type { Track, CuePoint } from '../common/types'

/**
 * Escape XML entities.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Traktor NML MUSICAL_KEY VALUE mapping (0..23).
 * Major: 0=C, 1=Db, 2=D, 3=Eb, 4=E, 5=F, 6=F#, 7=G, 8=Ab, 9=A, 10=Bb, 11=B
 * Minor: 12=Cm, 13=C#m, 14=Dm, 15=Ebm, 16=Em, 17=Fm, 18=F#m, 19=Gm, 20=G#m, 21=Am, 22=Bbm, 23=Bm
 */
const KEY_TO_TRAKTOR_INDEX: Record<string, number> = {
  // Camelot major (B)
  '8b': 0, '3b': 1, '10b': 2, '5b': 3, '12b': 4, '7b': 5,
  '2b': 6, '9b': 7, '4b': 8, '11b': 9, '6b': 10, '1b': 11,
  // Camelot minor (A)
  '5a': 12, '12a': 13, '7a': 14, '2a': 15, '9a': 16, '4a': 17,
  '11a': 18, '6a': 19, '1a': 20, '8a': 21, '3a': 22, '10a': 23,
  // Open Key major (d)
  '1d': 0, '8d': 1, '3d': 2, '10d': 3, '5d': 4, '12d': 5,
  '7d': 6, '2d': 7, '9d': 8, '4d': 9, '11d': 10, '6d': 11,
  // Open Key minor (m)
  '10m': 12, '5m': 13, '12m': 14, '7m': 15, '2m': 16, '9m': 17,
  '4m': 18, '11m': 19, '6m': 20, '1m': 21, '8m': 22, '3m': 23,
  // Standard musical notation major
  c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5,
  'f#': 6, gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11,
  // Standard musical notation minor
  cm: 12, 'c#m': 13, dbm: 13, dm: 14, 'd#m': 15, ebm: 15, em: 16, fm: 17,
  'f#m': 18, gbm: 18, gm: 19, 'g#m': 20, abm: 20, am: 21, 'a#m': 22, bbm: 22, bm: 23
}

export function mapKeyToTraktorValue(key: string | undefined): number | undefined {
  if (!key) return undefined
  const cleaned = key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/maj(or)?$/, '')
    .replace(/min(or)?$/, 'm')
  return KEY_TO_TRAKTOR_INDEX[cleaned]
}

/**
 * Convert a local file path to a Traktor NML LOCATION element and PRIMARYKEY.
 *
 * Traktor NML specification:
 * - Windows: C:\Music\Artist\Track.mp3
 *   -> DIR="/:Music/:Artist/:" FILE="Track.mp3" VOLUME="C:" VOLUMEID="C:"
 *   -> PRIMARYKEY="C:/:Music/:Artist/:Track.mp3"
 *
 * - macOS external volume: /Volumes/MyUSB/Music/Track.mp3
 *   -> DIR="/:Music/:" FILE="Track.mp3" VOLUME="MyUSB" VOLUMEID="MyUSB"
 *   -> PRIMARYKEY="MyUSB/:Music/:Track.mp3"
 *
 * - POSIX/macOS root: /Users/dj/Music/Track.mp3
 *   -> DIR="/:Users/:dj/:Music/:" FILE="Track.mp3" VOLUME="Macintosh HD" VOLUMEID="Macintosh HD"
 *   -> PRIMARYKEY="Macintosh HD/:Users/:dj/:Music/:Track.mp3"
 */
export function pathToTraktorLocation(filePath: string): {
  dir: string
  file: string
  volume: string
  primaryKey: string
} {
  const normalized = filePath.replace(/\\/g, '/').trim()

  let volume = ''
  let pathWithoutVolume = normalized

  // Windows drive letter: C:/Music/Artist/Track.mp3
  const winDrive = normalized.match(/^([A-Za-z]:)\/?(.*)$/)
  if (winDrive) {
    volume = winDrive[1].toUpperCase()
    pathWithoutVolume = winDrive[2]
  } else {
    // macOS /Volumes/<Name>/...
    const macVolume = normalized.match(/^\/Volumes\/([^/]+)\/?(.*)$/i)
    if (macVolume) {
      volume = macVolume[1]
      pathWithoutVolume = macVolume[2]
    } else if (normalized.startsWith('/')) {
      volume = 'Macintosh HD'
      pathWithoutVolume = normalized.slice(1)
    }
  }

  const segments = pathWithoutVolume.split('/').filter(Boolean)
  const file = segments.length > 0 ? segments[segments.length - 1] : ''
  const dirSegments = segments.slice(0, -1)

  const dir = dirSegments.length > 0 ? `/:${dirSegments.join('/:')}/:` : '/:'
  const primaryKey = `${volume}${dir}${file}`

  return { dir, file, volume, primaryKey }
}

/**
 * Map Rekordbox cue point to Traktor CUE_V2 XML element.
 * Rekordbox types: 0=Cue, 1=Fade-In, 2=Fade-Out, 3=Load, 4=Loop
 * Traktor types:   0=Cue, 1=Fade-In, 2=Fade-Out, 3=Load, 4=Grid, 5=Loop
 */
function buildCueV2Element(cue: CuePoint, index: number): string {
  const traktorType = cue.type === 4 ? 5 : cue.type
  const lenMs =
    cue.type === 4 && cue.endMs !== undefined && cue.endMs > cue.startMs
      ? cue.endMs - cue.startMs
      : 0
  const hotcue = cue.hotCueIndex !== undefined ? cue.hotCueIndex : -1
  const name = escapeXml(cue.name ?? '')
  return `      <CUE_V2 NAME="${name}" DISPL_ORDER="${index}" TYPE="${traktorType}" START="${cue.startMs.toFixed(6)}" LEN="${lenMs.toFixed(6)}" REPEATS="-1" HOTCUE="${hotcue}"/>`
}

function formatNmlDate(date: Date): { dateStr: string; timeSec: number } {
  const yyyy = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const timeSec = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()
  return { dateStr: `${yyyy}/${m}/${d}`, timeSec }
}

function mapRatingToTraktor(rating: number | undefined): number {
  if (!rating || rating <= 0) return 0
  // Rekordbox XML sometimes stores 0..255 or 1..5 stars
  if (rating <= 5) return Math.min(255, Math.round(rating * 51))
  return Math.min(255, Math.round(rating))
}

export type NmlBuildOptions = {
  /** Optional map of track internalId -> overridden file path (e.g., copied audio path) */
  pathOverrides?: Map<string, string>
  /** Optional date override for deterministic output */
  now?: Date
}

/**
 * Build a Traktor NML v19 XML string for a single playlist.
 * Generates a standalone NML file that can be imported directly into Traktor Pro 3/4.
 */
export function buildNml(
  playlistName: string,
  tracks: Track[],
  options: NmlBuildOptions = {}
): string {
  const { dateStr, timeSec } = formatNmlDate(options.now ?? new Date())
  const playlistUuid = randomUUID().replace(/-/g, '')

  // Deduplicate COLLECTION entries by PRIMARYKEY while preserving playlist order
  const uniqueEntries = new Map<string, string>()
  const pkEntries: string[] = []

  tracks.forEach((track, idx) => {
    const resolvedPath = options.pathOverrides?.get(track.internalId) ?? track.location
    const loc = resolvedPath ? pathToTraktorLocation(resolvedPath) : null
    const primaryKey = loc ? loc.primaryKey : `MISSING_${idx}`

    pkEntries.push(`            <PRIMARYKEY TYPE="TRACK" KEY="${escapeXml(primaryKey)}"/>`)

    if (uniqueEntries.has(primaryKey)) return

    const locationAttr = loc
      ? `DIR="${escapeXml(loc.dir)}" FILE="${escapeXml(loc.file)}" VOLUME="${escapeXml(loc.volume)}" VOLUMEID="${escapeXml(loc.volume)}"`
      : `DIR="/:" FILE="" VOLUME="" VOLUMEID=""`

    // Info attributes
    const infoAttrs: string[] = []
    if (track.bitrate !== undefined) {
      // Traktor stores bitrate in bits/sec (e.g. 320000); Rekordbox stores kbps (320)
      const bps = track.bitrate < 10000 ? track.bitrate * 1000 : track.bitrate
      infoAttrs.push(`BITRATE="${bps}"`)
    }
    if (track.genre) infoAttrs.push(`GENRE="${escapeXml(track.genre)}"`)
    if (track.comments) infoAttrs.push(`COMMENT="${escapeXml(track.comments)}"`)
    if (track.key) infoAttrs.push(`KEY="${escapeXml(track.key)}"`)
    if (track.label) infoAttrs.push(`LABEL="${escapeXml(track.label)}"`)
    if (track.durationSeconds !== undefined) {
      infoAttrs.push(`PLAYTIME="${Math.round(track.durationSeconds)}"`)
      infoAttrs.push(`PLAYTIME_FLOAT="${track.durationSeconds.toFixed(6)}"`)
    }
    const traktorRating = mapRatingToTraktor(track.rating)
    if (traktorRating > 0) infoAttrs.push(`RANKING="${traktorRating}"`)
    infoAttrs.push(`IMPORT_DATE="${dateStr}"`)
    if (track.year && track.year > 1900) {
      infoAttrs.push(`RELEASE_DATE="${track.year}/1/1"`)
    }
    if (track.fileSize !== undefined) {
      infoAttrs.push(`FILESIZE="${Math.max(0, Math.round(track.fileSize / 1024))}"`)
    }
    infoAttrs.push('FLAGS="10"')

    const childLines: string[] = [`      <LOCATION ${locationAttr}/>`]
    if (track.album) {
      childLines.push(`      <ALBUM TITLE="${escapeXml(track.album)}"/>`)
    }
    childLines.push(`      <INFO ${infoAttrs.join(' ')}/>`)
    if (track.bpm !== undefined && track.bpm > 0) {
      childLines.push(`      <TEMPO BPM="${track.bpm.toFixed(6)}" BPM_QUALITY="100.000000"/>`)
    }
    const keyVal = mapKeyToTraktorValue(track.key)
    if (keyVal !== undefined) {
      childLines.push(`      <MUSICAL_KEY VALUE="${keyVal}"/>`)
    }
    if (track.cuePoints && track.cuePoints.length > 0) {
      track.cuePoints.forEach((cue, cueIdx) => {
        childLines.push(buildCueV2Element(cue, cueIdx))
      })
    }

    const entryXml = `    <ENTRY MODIFIED_DATE="${dateStr}" MODIFIED_TIME="${timeSec}" LOCK="0" TITLE="${escapeXml(track.name)}" ARTIST="${escapeXml(track.artist)}">\n${childLines.join('\n')}\n    </ENTRY>`
    uniqueEntries.set(primaryKey, entryXml)
  })

  const entriesList = Array.from(uniqueEntries.values())

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"/>
  <MUSICFOLDERS/>
  <COLLECTION ENTRIES="${entriesList.length}">
${entriesList.join('\n')}
  </COLLECTION>
  <SETS ENTRIES="0"/>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="1">
        <NODE TYPE="PLAYLIST" NAME="${escapeXml(playlistName)}">
          <PLAYLIST ENTRIES="${tracks.length}" TYPE="LIST" UUID="${playlistUuid}">
${pkEntries.join('\n')}
          </PLAYLIST>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
</NML>
`
}

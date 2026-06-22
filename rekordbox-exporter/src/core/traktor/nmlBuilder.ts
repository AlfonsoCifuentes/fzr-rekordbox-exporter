import type { Track } from '../common/types'

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
 * Convert a file path to a Traktor NML LOCATION element.
 * Traktor uses DIR and FILE attributes.
 * Example: C:\Music\Artist\Track.mp3
 *   -> <LOCATION DIR="/:C:/Music/Artist/:" FILE="Track.mp3" VOLUME="C:" VOLUMEID="C:"/>
 */
function pathToTraktorLocation(filePath: string): {
  dir: string
  file: string
  volume: string
} {
  // Normalize to forward slashes
  const normalized = filePath.replace(/\\/g, '/')

  const lastSlash = normalized.lastIndexOf('/')
  const file = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized
  let dir = lastSlash >= 0 ? normalized.slice(0, lastSlash + 1) : '/'

  // Traktor dir format: /: prefix and replace / with /: for each segment
  // e.g. C:/Music/Artist/ -> /:C:/Music/Artist/:
  // Simple approach: wrap with /: ... /:
  dir = '/: ' + dir.replace(/\//g, '/:').trim()

  // Extract volume (Windows drive letter)
  const volumeMatch = normalized.match(/^([A-Za-z]:)/)
  const volume = volumeMatch ? volumeMatch[1].toUpperCase() : ''

  return { dir, file, volume }
}

/**
 * Build a Traktor NML XML string for a single playlist.
 * Generates a standalone NML file that can be imported into Traktor.
 */
export function buildNml(playlistName: string, tracks: Track[]): string {
  const entries = tracks.map((track, i) => {
    const loc = track.location ? pathToTraktorLocation(track.location) : null

    const locationAttr = loc
      ? `DIR="${escapeXml(loc.dir)}" FILE="${escapeXml(loc.file)}" VOLUME="${escapeXml(loc.volume)}" VOLUMEID="${escapeXml(loc.volume)}"`
      : `DIR="/: /:" FILE="" VOLUME="" VOLUMEID=""`

    const bpmAttr = track.bpm !== undefined ? ` BPM="${track.bpm.toFixed(6)}"` : ''
    const keyAttr = track.key ? ` MUSICAL_KEY="${escapeXml(track.key)}"` : ''
    const genreAttr = track.genre ? ` GENRE="${escapeXml(track.genre)}"` : ''
    const albumAttr = track.album ? ` ALBUM="${escapeXml(track.album)}"` : ''
    const commentAttr = track.comments ? ` COMMENT="${escapeXml(track.comments)}"` : ''
    const playingTime =
      track.durationSeconds !== undefined
        ? ` PLAYTIME="${Math.round(track.durationSeconds)}" PLAYTIME_FLOAT="${track.durationSeconds.toFixed(6)}"`
        : ''

    return `    <ENTRY MODIFIED_DATE="2026/01/01" MODIFIED_TIME="0" LOCK="0" LOCK_MODIFICATION_TIME="2026/01/01" TITLE="${escapeXml(track.name)}" ARTIST="${escapeXml(track.artist)}"${albumAttr}${genreAttr}${commentAttr}>
      <LOCATION ${locationAttr}/>
      <INFO${bpmAttr}${keyAttr}${playingTime} RATING="0" IMPORT_DATE="2026/01/01" RELEASE_DATE="" FILESIZE="${track.fileSize ?? 0}" FLAGS="0" BITRATE="${track.bitrate ?? 0}"/>
      <TEMPO BPM="${track.bpm !== undefined ? track.bpm.toFixed(6) : '0.000000'}" BPM_QUALITY="100"/>
    </ENTRY>`
  })

  // Build PRIMARYKEY references for the playlist
  const pkEntries = tracks.map((track, i) => {
    const loc = track.location ? pathToTraktorLocation(track.location) : null
    const key = loc
      ? `${loc.volume}${loc.dir.replace('/: ', '/').replace('/:', '/')}${loc.file}`
      : `MISSING_${i}`
    return `      <PRIMARYKEY TYPE="TRACK" KEY="${escapeXml(key)}"/>`
  })

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"/>
  <MUSICFOLDERS/>
  <COLLECTION ENTRIES="${tracks.length}">
${entries.join('\n')}
  </COLLECTION>
  <SETS ENTRIES="0"/>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="1">
        <NODE TYPE="PLAYLIST" NAME="${escapeXml(playlistName)}">
          <PLAYLIST ENTRIES="${tracks.length}" TYPE="LIST" UUID="">
${pkEntries.join('\n')}
          </PLAYLIST>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
</NML>
`
}

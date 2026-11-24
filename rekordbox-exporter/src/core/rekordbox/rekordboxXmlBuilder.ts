import type { Playlist, Track } from '../common/types'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Convert a local path to Rekordbox XML Location URI format:
 * C:/Music/Artist A/Track.mp3 -> file://localhost/C:/Music/Artist%20A/Track.mp3
 */
export function pathToRekordboxUri(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const encoded = normalized
    .split('/')
    .map((segment, idx) => {
      // Keep Windows drive letter C: unencoded
      if (idx === 0 && /^[A-Za-z]:$/.test(segment)) return segment
      return encodeURIComponent(segment)
    })
    .join('/')

  const prefix = encoded.startsWith('/') ? 'file://localhost' : 'file://localhost/'
  return `${prefix}${encoded}`
}

export type RekordboxXmlOptions = {
  pathOverrides?: Map<string, string>
}

/**
 * Build a valid Rekordbox DJ_PLAYLISTS XML document from one or more playlists.
 * Preserves track metadata, Hot Cues / Loops (POSITION_MARK), and nested folder structure.
 */
export function buildRekordboxXml(
  playlists: Playlist[],
  options: RekordboxXmlOptions = {}
): string {
  // Deduplicate tracks into COLLECTION and assign sequential TrackIDs
  const trackIdByKey = new Map<string, number>()
  const uniqueTracks: Array<{ id: number; track: Track; location?: string }> = []
  let nextId = 1

  const getTrackKey = (t: Track, resolvedLoc?: string): string =>
    resolvedLoc ? resolvedLoc.toLowerCase() : `${t.internalId}`

  for (const pl of playlists) {
    for (const track of pl.tracks) {
      const resolvedLoc = options.pathOverrides?.get(track.internalId) ?? track.location
      const key = getTrackKey(track, resolvedLoc)
      if (!trackIdByKey.has(key)) {
        const id = nextId++
        trackIdByKey.set(key, id)
        uniqueTracks.push({ id, track, location: resolvedLoc })
      }
    }
  }

  const trackNodes = uniqueTracks.map(({ id, track, location }) => {
    const attrs: string[] = [
      `TrackID="${id}"`,
      `Name="${escapeXml(track.name)}"`,
      `Artist="${escapeXml(track.artist)}"`
    ]
    if (track.composer) attrs.push(`Composer="${escapeXml(track.composer)}"`)
    if (track.album) attrs.push(`Album="${escapeXml(track.album)}"`)
    if (track.genre) attrs.push(`Genre="${escapeXml(track.genre)}"`)
    if (track.label) attrs.push(`Label="${escapeXml(track.label)}"`)
    if (track.remixer) attrs.push(`Remixer="${escapeXml(track.remixer)}"`)
    if (track.mix) attrs.push(`Mix="${escapeXml(track.mix)}"`)
    if (track.fileSize !== undefined) attrs.push(`Size="${Math.round(track.fileSize)}"`)
    if (track.durationSeconds !== undefined)
      attrs.push(`TotalTime="${Math.round(track.durationSeconds)}"`)
    if (track.year !== undefined) attrs.push(`Year="${track.year}"`)
    if (track.bpm !== undefined) attrs.push(`AverageBpm="${track.bpm.toFixed(2)}"`)
    if (track.dateAdded) attrs.push(`DateAdded="${escapeXml(track.dateAdded)}"`)
    if (track.bitrate !== undefined) attrs.push(`BitRate="${Math.round(track.bitrate)}"`)
    if (track.sampleRate !== undefined) attrs.push(`SampleRate="${Math.round(track.sampleRate)}"`)
    if (track.comments) attrs.push(`Comments="${escapeXml(track.comments)}"`)
    if (track.rating !== undefined) {
      const rbRating = track.rating <= 5 ? track.rating * 51 : track.rating
      attrs.push(`Rating="${Math.min(255, Math.round(rbRating))}"`)
    }
    if (location) attrs.push(`Location="${escapeXml(pathToRekordboxUri(location))}"`)
    if (track.key) attrs.push(`Tonality="${escapeXml(track.key)}"`)

    if (!track.cuePoints || track.cuePoints.length === 0) {
      return `    <TRACK ${attrs.join(' ')}/>`
    }

    const markNodes = track.cuePoints.map((cue) => {
      const mAttrs: string[] = [
        `Name="${escapeXml(cue.name ?? '')}"`,
        `Type="${cue.type}"`,
        `Start="${(cue.startMs / 1000).toFixed(3)}"`
      ]
      if (cue.type === 4 && cue.endMs !== undefined) {
        mAttrs.push(`End="${(cue.endMs / 1000).toFixed(3)}"`)
      }
      mAttrs.push(`Num="${cue.hotCueIndex ?? -1}"`)
      if (cue.color) {
        mAttrs.push(`Red="${cue.color.r}" Green="${cue.color.g}" Blue="${cue.color.b}"`)
      }
      return `      <POSITION_MARK ${mAttrs.join(' ')}/>`
    })

    return `    <TRACK ${attrs.join(' ')}>\n${markNodes.join('\n')}\n    </TRACK>`
  })

  // Build playlist nodes inside ROOT
  const playlistNodes = playlists.map((pl) => {
    const refs = pl.tracks.map((t) => {
      const resolvedLoc = options.pathOverrides?.get(t.internalId) ?? t.location
      const id = trackIdByKey.get(getTrackKey(t, resolvedLoc))!
      return `        <TRACK Key="${id}"/>`
    })
    return `      <NODE Name="${escapeXml(pl.name)}" Type="1" KeyType="0" Entries="${pl.tracks.length}">\n${refs.join('\n')}\n      </NODE>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="FZR Rekordbox Exporter" Version="1.3.0" Company="FZR"/>
  <COLLECTION Entries="${uniqueTracks.length}">
${trackNodes.join('\n')}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="${playlists.length}">
${playlistNodes.join('\n')}
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>
`
}

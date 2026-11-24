import type { Playlist } from '../common/types'
import { analyzePlaylist, normalizeToCamelot } from '../analytics/analyzePlaylist'

function formatTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Build a clean timestamped DJ Setlist (.txt) ready for YouTube chapters,
 * SoundCloud descriptions, Mixcloud, or radio promo sheets.
 */
export function buildDjSetlistTxt(playlist: Playlist): string {
  const lines: string[] = [
    `${playlist.name}`,
    `${'='.repeat(Math.min(60, Math.max(12, playlist.name.length)))}`,
    ''
  ]

  let elapsed = 0
  playlist.tracks.forEach((track, idx) => {
    const num = String(idx + 1).padStart(2, '0')
    const ts = formatTimestamp(elapsed)
    const meta: string[] = []
    if (track.bpm) meta.push(`${Math.round(track.bpm)} BPM`)
    const cam = normalizeToCamelot(track.key)?.code ?? track.key
    if (cam) meta.push(cam)
    const suffix = meta.length > 0 ? ` [${meta.join(' | ')}]` : ''
    lines.push(`${num}. [${ts}] ${track.artist} - ${track.name}${suffix}`)
    elapsed += track.durationSeconds && track.durationSeconds > 0 ? track.durationSeconds : 0
  })

  return lines.join('\r\n') + '\r\n'
}

/**
 * Build a rich Markdown DJ Setlist (.md) including BPM range, Camelot harmonic score, and full table.
 */
export function buildDjSetlistMarkdown(playlist: Playlist): string {
  const stats = analyzePlaylist(playlist)
  const lines: string[] = [
    `# ${playlist.name}`,
    '',
    `- **Tracks:** ${stats.totalTracks}`,
    `- **Total Duration:** ${formatTimestamp(stats.totalDurationSeconds)}`
  ]

  if (stats.bpmMin !== undefined && stats.bpmMax !== undefined) {
    lines.push(`- **BPM Range:** ${stats.bpmMin} – ${stats.bpmMax} (avg ${stats.bpmAvg})`)
  }
  if (stats.harmonicScore !== null) {
    lines.push(`- **Harmonic Compatibility:** ${stats.harmonicScore}%`)
  }

  lines.push('', '| # | Timestamp | Artist | Title | BPM | Key | Duration |', '|---:|---|---|---|---|---|---:|')

  let elapsed = 0
  playlist.tracks.forEach((track, idx) => {
    const ts = formatTimestamp(elapsed)
    const cam = normalizeToCamelot(track.key)?.code ?? track.key ?? '—'
    const bpm = track.bpm ? Math.round(track.bpm).toString() : '—'
    const dur = track.durationSeconds ? formatTimestamp(track.durationSeconds) : '—'
    const esc = (s: string) => s.replace(/\|/g, '\\|')
    lines.push(`| ${idx + 1} | ${ts} | ${esc(track.artist)} | ${esc(track.name)} | ${bpm} | ${cam} | ${dur} |`)
    elapsed += track.durationSeconds && track.durationSeconds > 0 ? track.durationSeconds : 0
  })

  return lines.join('\n') + '\n'
}

/**
 * Build a universal streaming CSV compatible with Soundiiz, TuneMyMusic, Apple Music, Tidal & Deezer.
 */
export function buildStreamingCsv(playlist: Playlist): string {
  const esc = (v: string): string =>
    v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v

  const header = 'title,artist,album,duration_seconds,bpm,key,genre'
  const rows = playlist.tracks.map((t) =>
    [
      esc(t.name),
      esc(t.artist),
      esc(t.album ?? ''),
      t.durationSeconds !== undefined ? Math.round(t.durationSeconds) : '',
      t.bpm !== undefined ? Math.round(t.bpm) : '',
      esc(normalizeToCamelot(t.key)?.code ?? t.key ?? ''),
      esc(t.genre ?? '')
    ].join(',')
  )

  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n'
}

/**
 * Build a standard DJ CUE Sheet (.cue) compatible with Mixcloud, Audacity,
 * foobar2000, and DJ mix recorders (INDEX 01 MM:SS:00 format).
 */
export function buildCueSheet(playlist: Playlist, audioFileName?: string): string {
  const q = (s: string): string => s.replace(/"/g, "'")
  const fileRef = audioFileName || `${playlist.name}.wav`
  const lines: string[] = [
    `REM GENERATOR "FZR Rekordbox Exporter v1.4.0"`,
    `TITLE "${q(playlist.name)}"`,
    `FILE "${q(fileRef)}" WAVE`
  ]

  let elapsedSec = 0
  playlist.tracks.forEach((track, idx) => {
    const trackNum = String(idx + 1).padStart(2, '0')
    const totalMinutes = Math.floor(elapsedSec / 60)
    const secs = Math.floor(elapsedSec % 60)
    const indexTs = `${String(totalMinutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}:00`

    lines.push(`  TRACK ${trackNum} AUDIO`)
    lines.push(`    TITLE "${q(track.name)}"`)
    lines.push(`    PERFORMER "${q(track.artist)}"`)
    if (track.bpm) lines.push(`    REM BPM ${Math.round(track.bpm)}`)
    const cam = normalizeToCamelot(track.key)?.code ?? track.key
    if (cam) lines.push(`    REM KEY ${cam}`)
    lines.push(`    INDEX 01 ${indexTs}`)

    elapsedSec += track.durationSeconds && track.durationSeconds > 0 ? track.durationSeconds : 0
  })

  return lines.join('\r\n') + '\r\n'
}

/**
 * Remap audio file path prefixes across playlists (e.g., /Volumes/USB -> D:/Music or C:\Music -> E:\DJ).
 * Slash-insensitive and case-insensitive on drive/prefix matching.
 */
export function remapPlaylistPaths(
  playlists: Playlist[],
  fromPrefix: string,
  toPrefix: string
): { playlists: Playlist[]; remappedCount: number } {
  const normFrom = fromPrefix.replace(/\\/g, '/').replace(/\/+$/, '')
  const normTo = toPrefix.replace(/\\/g, '/').replace(/\/+$/, '')
  if (!normFrom) return { playlists, remappedCount: 0 }

  const lowerFrom = normFrom.toLowerCase()
  let remappedCount = 0

  const nextPlaylists = playlists.map((pl) => ({
    ...pl,
    tracks: pl.tracks.map((track) => {
      if (!track.location) return track
      const normLoc = track.location.replace(/\\/g, '/')
      if (normLoc.toLowerCase().startsWith(lowerFrom)) {
        const rest = normLoc.slice(normFrom.length)
        // Ensure boundary match (either exact or followed by '/')
        if (rest === '' || rest.startsWith('/')) {
          remappedCount++
          return { ...track, location: `${normTo}${rest}` }
        }
      }
      return track
    })
  }))

  return { playlists: nextPlaylists, remappedCount }
}

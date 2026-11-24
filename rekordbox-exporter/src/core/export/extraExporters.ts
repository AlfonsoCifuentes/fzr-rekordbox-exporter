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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Build a self-contained, printable, tablet-friendly HTML Booth Prep Sheet (.html)
 * featuring BPM curve, Camelot key badges, cumulative timestamps, and cue counts.
 */
export function buildHtmlPrepSheet(playlist: Playlist): string {
  const stats = analyzePlaylist(playlist)
  let elapsed = 0

  const rowsHtml = playlist.tracks
    .map((t, idx) => {
      const ts = formatTimestamp(elapsed)
      const cam = normalizeToCamelot(t.key)?.code ?? t.key ?? '—'
      const bpm = t.bpm ? Math.round(t.bpm).toString() : '—'
      const dur = t.durationSeconds ? formatTimestamp(t.durationSeconds) : '—'
      const cues = t.cuePoints?.length ?? 0
      const tr = idx > 0 ? stats.transitions[idx - 1] : null
      const trBadge =
        tr && tr.rating !== 'unknown'
          ? tr.rating === 'perfect'
            ? '<span class="badge ok">✓ Camelot</span>'
            : tr.rating === 'energy'
              ? '<span class="badge energy">⚡ Boost</span>'
              : '<span class="badge clash">⚠ Clash</span>'
          : '<span class="dim">—</span>'
      elapsed += t.durationSeconds && t.durationSeconds > 0 ? t.durationSeconds : 0

      return `<tr>
        <td class="mono dim">${String(idx + 1).padStart(2, '0')}</td>
        <td class="mono">${ts}</td>
        <td><strong>${escapeHtml(t.name)}</strong><div class="sub">${escapeHtml(t.artist)}</div></td>
        <td class="mono">${bpm}</td>
        <td class="mono"><span class="key-pill">${escapeHtml(cam)}</span></td>
        <td class="mono">${cues > 0 ? cues : '—'}</td>
        <td>${trBadge}</td>
        <td class="mono right">${dur}</td>
      </tr>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(playlist.name)} — FZR Booth Prep Sheet</title>
  <style>
    :root { --bg:#07080d; --card:#101420; --border:#232a3d; --text:#eef2fa; --muted:#8a94ac; --blue:#0095ff; --amber:#ff7a1a; --green:#1db954; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; padding:32px 24px; line-height:1.45; }
    .wrap { max-width:980px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; border-bottom:2px solid var(--border); padding-bottom:18px; margin-bottom:20px; flex-wrap:wrap; }
    .brand { font-size:11px; font-family:monospace; letter-spacing:1.4px; color:var(--blue); font-weight:700; text-transform:uppercase; margin-bottom:6px; }
    h1 { font-size:28px; font-weight:800; letter-spacing:-0.5px; }
    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:22px; }
    .kpi { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:14px 16px; }
    .kpi-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.6px; }
    .kpi-val { font-size:22px; font-weight:800; font-family:monospace; margin-top:4px; }
    table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--border); border-radius:12px; overflow:hidden; font-size:13px; }
    th { text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:0.6px; color:var(--muted); background:#151a2a; padding:11px 12px; border-bottom:1px solid var(--border); }
    td { padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.05); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    .sub { font-size:11.5px; color:var(--muted); margin-top:2px; }
    .mono { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; }
    .dim { color:var(--muted); }
    .right { text-align:right; }
    .key-pill { display:inline-block; padding:2px 8px; border-radius:99px; background:rgba(0,149,255,0.16); color:#6cc2ff; border:1px solid rgba(0,149,255,0.35); font-size:11px; font-weight:700; }
    .badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:10.5px; font-weight:700; }
    .ok { background:rgba(29,185,84,0.16); color:#46ee82; }
    .energy { background:rgba(255,122,26,0.18); color:#ffab5e; }
    .clash { background:rgba(239,83,80,0.18); color:#ff8a80; }
    .footer { margin-top:20px; font-size:11px; color:var(--muted); text-align:center; font-family:monospace; }
    @media print { body { background:#fff; color:#111; padding:12px; } .kpi, table { background:#fff; border-color:#ddd; } th { background:#f5f5f5; color:#333; } .sub,.dim { color:#555; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <div class="brand">FZR Booth Prep Sheet · v1.5.0</div>
        <h1>${escapeHtml(playlist.name)}</h1>
      </div>
      <div class="mono dim">${new Date().toISOString().slice(0, 10)}</div>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Tracks / Duración</div><div class="kpi-val">${stats.totalTracks} · ${formatTimestamp(stats.totalDurationSeconds)}</div></div>
      <div class="kpi"><div class="kpi-label">Rango BPM</div><div class="kpi-val">${stats.bpmMin !== undefined ? `${stats.bpmMin}–${stats.bpmMax}` : '—'}</div></div>
      <div class="kpi"><div class="kpi-label">Flujo Camelot</div><div class="kpi-val" style="color:var(--green)">${stats.harmonicScore !== null ? `${stats.harmonicScore}%` : '—'}</div></div>
      <div class="kpi"><div class="kpi-label">Hot Cues</div><div class="kpi-val" style="color:var(--amber)">${stats.totalCuePoints}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:42px">#</th>
          <th style="width:74px">Time</th>
          <th>Track / Artist</th>
          <th style="width:66px">BPM</th>
          <th style="width:72px">Key</th>
          <th style="width:58px">Cues</th>
          <th style="width:96px">Flow</th>
          <th style="width:68px" class="right">Dur</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <div class="footer">Generated locally with FZR Rekordbox Exporter · Zero Cloud Upload</div>
  </div>
</body>
</html>
`
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

import type { Playlist, ExportResult, TrackExportStatus } from '../common/types'
import { buildM3U8 } from './m3uBuilder'
import { buildNml } from './nmlBuilder'

export type ExportOptions = {
  exportM3U8: boolean
  exportNml: boolean
  /** Base folder where export files will be saved (provided by caller) */
  outputDir: string
}

export type ExportOutput = {
  m3u8Content?: string
  nmlContent?: string
  reportJson: string
  reportCsv: string
  result: ExportResult
  trackStatuses: TrackExportStatus[]
}

/**
 * Build export content strings for a playlist.
 * File writing is handled by the Electron main process (IPC).
 */
export function exportPlaylist(playlist: Playlist, options: ExportOptions): ExportOutput {
  const trackStatuses: TrackExportStatus[] = playlist.tracks.map((track) => ({
    track,
    m3uIncluded: options.exportM3U8 && !!track.location,
    nmlIncluded: options.exportNml && !!track.location,
    warnings: !track.location ? ['Ruta de archivo no disponible'] : []
  }))

  const m3u8Content = options.exportM3U8 ? buildM3U8(playlist) : undefined
  const nmlContent = options.exportNml ? buildNml(playlist.name, playlist.tracks) : undefined

  const safePlaylistName = playlist.name.replace(/[<>:"/\\|?*]/g, '_')
  const exportedAt = new Date().toISOString()

  const result: ExportResult = {
    playlistName: playlist.name,
    totalTracks: playlist.tracks.length,
    matchedTracks: 0,
    ambiguousTracks: 0,
    notFoundTracks: 0,
    nmlPath: options.exportNml ? `${options.outputDir}/${safePlaylistName}.nml` : undefined,
    m3uPath: options.exportM3U8 ? `${options.outputDir}/${safePlaylistName}.m3u8` : undefined,
    exportedAt
  }

  // JSON report
  const reportData = {
    playlist: playlist.name,
    createdAt: exportedAt,
    totalTracks: playlist.tracks.length,
    traktor: {
      nmlPath: result.nmlPath ?? null,
      m3u8Path: result.m3uPath ?? null
    },
    tracks: trackStatuses.map((ts, i) => ({
      position: i + 1,
      title: ts.track.name,
      artist: ts.track.artist,
      album: ts.track.album ?? null,
      bpm: ts.track.bpm ?? null,
      key: ts.track.key ?? null,
      durationSeconds: ts.track.durationSeconds ?? null,
      location: ts.track.location ?? null,
      m3uIncluded: ts.m3uIncluded,
      nmlIncluded: ts.nmlIncluded,
      warnings: ts.warnings
    }))
  }
  const reportJson = JSON.stringify(reportData, null, 2)

  // CSV report
  const csvHeader = 'position,title,artist,album,bpm,key,duration_s,location,m3u_included,nml_included,warnings'
  const csvRows = trackStatuses.map((ts, i) => {
    const fields = [
      i + 1,
      csvEscape(ts.track.name),
      csvEscape(ts.track.artist),
      csvEscape(ts.track.album ?? ''),
      ts.track.bpm ?? '',
      csvEscape(ts.track.key ?? ''),
      ts.track.durationSeconds ?? '',
      csvEscape(ts.track.location ?? ''),
      ts.m3uIncluded ? 'true' : 'false',
      ts.nmlIncluded ? 'true' : 'false',
      csvEscape(ts.warnings.join('; '))
    ]
    return fields.join(',')
  })
  const reportCsv = [csvHeader, ...csvRows].join('\n')

  return { m3u8Content, nmlContent, reportJson, reportCsv, result, trackStatuses }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

import { join } from 'path'
import type { Playlist, ExportResult, TrackExportStatus, SpotifyMatch } from '../common/types'
import { sanitizeFilename } from '../common/filePaths'
import { buildM3U8 } from './m3uBuilder'
import { buildNml } from './nmlBuilder'

export type ExportOptions = {
  exportM3U8: boolean
  exportNml: boolean
  /** Base folder where export files for this playlist will be saved */
  outputDir: string
  /** Write relative paths inside M3U8 */
  relativeM3uPaths?: boolean
  /** Optional map of track internalId -> overridden file path (e.g. copied audio files) */
  pathOverrides?: Map<string, string>
  /** Optional map of track internalId -> whether local audio file exists on disk */
  fileExistsMap?: Map<string, boolean>
  /** Optional map of track internalId -> SpotifyMatch (if Spotify matching was run) */
  spotifyMatches?: Map<string, SpotifyMatch>
  /** Optional Spotify playlist URL if already created */
  spotifyPlaylistUrl?: string
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
  let missingFilesCount = 0
  let matchedTracks = 0
  let ambiguousTracks = 0
  let notFoundTracks = 0

  const trackStatuses: TrackExportStatus[] = playlist.tracks.map((track) => {
    const warnings: string[] = []
    const effectivePath = options.pathOverrides?.get(track.internalId) ?? track.location
    const existsOnDisk = options.fileExistsMap?.get(track.internalId)

    if (!effectivePath) {
      warnings.push('Ruta de archivo no disponible')
      missingFilesCount++
    } else if (existsOnDisk === false) {
      warnings.push('Archivo local no encontrado en disco')
      missingFilesCount++
    }

    const spotifyMatch = options.spotifyMatches?.get(track.internalId)
    if (spotifyMatch) {
      if (spotifyMatch.excluded) {
        notFoundTracks++
      } else if (spotifyMatch.status === 'matched' || spotifyMatch.status === 'manual') {
        matchedTracks++
      } else if (spotifyMatch.status === 'ambiguous') {
        ambiguousTracks++
      } else {
        notFoundTracks++
      }
    }

    return {
      track,
      spotifyMatch,
      m3uIncluded: options.exportM3U8 && !!effectivePath,
      nmlIncluded: options.exportNml && !!effectivePath,
      fileExists: existsOnDisk,
      copiedTo: options.pathOverrides?.get(track.internalId),
      warnings
    }
  })

  const m3u8Content = options.exportM3U8
    ? buildM3U8(playlist, {
        relativeToDir: options.relativeM3uPaths ? options.outputDir : undefined,
        pathOverrides: options.pathOverrides
      })
    : undefined

  const nmlContent = options.exportNml
    ? buildNml(playlist.name, playlist.tracks, {
        pathOverrides: options.pathOverrides
      })
    : undefined

  const safePlaylistName = sanitizeFilename(playlist.name)
  const exportedAt = new Date().toISOString()

  const nmlPath = options.exportNml ? join(options.outputDir, `${safePlaylistName}.nml`) : undefined
  const m3uPath = options.exportM3U8 ? join(options.outputDir, `${safePlaylistName}.m3u8`) : undefined

  const result: ExportResult = {
    playlistName: playlist.name,
    folderPath: playlist.path.slice(0, -1),
    totalTracks: playlist.tracks.length,
    matchedTracks,
    ambiguousTracks,
    notFoundTracks,
    missingFilesCount,
    spotifyPlaylistUrl: options.spotifyPlaylistUrl,
    nmlPath,
    m3uPath,
    exportedAt
  }

  // JSON report
  const reportData = {
    playlist: playlist.name,
    folderPath: playlist.path.slice(0, -1),
    createdAt: exportedAt,
    totalTracks: playlist.tracks.length,
    missingFilesCount,
    spotify: options.spotifyMatches
      ? {
          created: Boolean(options.spotifyPlaylistUrl),
          url: options.spotifyPlaylistUrl ?? null,
          matched: matchedTracks,
          ambiguous: ambiguousTracks,
          notFound: notFoundTracks
        }
      : null,
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
      cuePointsCount: ts.track.cuePoints?.length ?? 0,
      location: ts.copiedTo ?? ts.track.location ?? null,
      fileExists: ts.fileExists ?? null,
      m3uIncluded: ts.m3uIncluded,
      nmlIncluded: ts.nmlIncluded,
      spotifyStatus: ts.spotifyMatch
        ? ts.spotifyMatch.excluded
          ? 'excluded'
          : ts.spotifyMatch.status
        : null,
      spotifyTitle: ts.spotifyMatch?.title ?? null,
      spotifyArtists: ts.spotifyMatch?.artists?.join(', ') ?? null,
      spotifyUri: ts.spotifyMatch?.spotifyUri ?? null,
      spotifyConfidence: ts.spotifyMatch?.confidence ?? null,
      warnings: ts.warnings
    }))
  }
  const reportJson = JSON.stringify(reportData, null, 2)

  // CSV report (UTF-8 BOM friendly)
  const csvHeader =
    'position,title,artist,album,bpm,key,duration_s,location,file_exists,m3u_included,nml_included,spotify_status,spotify_title,spotify_artist,spotify_confidence,spotify_uri,warnings'
  const csvRows = trackStatuses.map((ts, i) => {
    const sm = ts.spotifyMatch
    const fields = [
      i + 1,
      csvEscape(ts.track.name),
      csvEscape(ts.track.artist),
      csvEscape(ts.track.album ?? ''),
      ts.track.bpm ?? '',
      csvEscape(ts.track.key ?? ''),
      ts.track.durationSeconds ?? '',
      csvEscape(ts.copiedTo ?? ts.track.location ?? ''),
      ts.fileExists === undefined ? '' : ts.fileExists ? 'true' : 'false',
      ts.m3uIncluded ? 'true' : 'false',
      ts.nmlIncluded ? 'true' : 'false',
      sm ? (sm.excluded ? 'excluded' : sm.status) : '',
      csvEscape(sm?.title ?? ''),
      csvEscape(sm?.artists?.join(', ') ?? ''),
      sm ? sm.confidence : '',
      csvEscape(sm?.spotifyUri ?? ''),
      csvEscape(ts.warnings.join('; '))
    ]
    return fields.join(',')
  })
  const reportCsv = '\uFEFF' + [csvHeader, ...csvRows].join('\r\n')

  return { m3u8Content, nmlContent, reportJson, reportCsv, result, trackStatuses }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

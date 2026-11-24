import { relative } from 'path'
import type { Playlist } from '../common/types'

export type M3U8Options = {
  /** If provided, paths will be written relative to this directory */
  relativeToDir?: string
  /** Optional map of track internalId -> overridden file path (e.g., copied audio path) */
  pathOverrides?: Map<string, string>
}

/**
 * Build a .m3u8 string from a Playlist.
 * Uses UTF-8 extended M3U format with #EXTINF duration and display name.
 */
export function buildM3U8(playlist: Playlist, options: M3U8Options = {}): string {
  const lines: string[] = ['#EXTM3U', `#PLAYLIST:${playlist.name}`, '']

  for (const track of playlist.tracks) {
    const duration =
      track.durationSeconds !== undefined ? Math.round(track.durationSeconds) : -1
    const displayName = `${track.artist} - ${track.name}`
    lines.push(`#EXTINF:${duration},${displayName}`)

    const rawLocation = options.pathOverrides?.get(track.internalId) ?? track.location
    if (rawLocation) {
      let formattedPath = rawLocation
      if (options.relativeToDir) {
        try {
          const rel = relative(options.relativeToDir, rawLocation)
          if (rel && !rel.startsWith('..') && !/^[A-Za-z]:/.test(rel)) {
            formattedPath = rel
          } else if (rel && !/^[A-Za-z]:/.test(rel)) {
            formattedPath = rel
          }
        } catch {
          formattedPath = rawLocation
        }
      }
      // Normalize Windows backslashes to forward slashes for cross-player compatibility
      lines.push(formattedPath.replace(/\\/g, '/'))
    } else {
      lines.push(`# MISSING FILE: ${displayName}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

import type { Playlist } from '../common/types'

/**
 * Build a .m3u8 string from a Playlist.
 * Uses UTF-8 extended M3U format with #EXTINF duration and display name.
 */
export function buildM3U8(playlist: Playlist): string {
  const lines: string[] = ['#EXTM3U', `#PLAYLIST:${playlist.name}`, '']

  for (const track of playlist.tracks) {
    const duration = track.durationSeconds !== undefined ? Math.round(track.durationSeconds) : -1
    const displayName = `${track.artist} - ${track.name}`
    lines.push(`#EXTINF:${duration},${displayName}`)

    if (track.location) {
      // Normalize Windows backslashes to forward slashes for m3u compatibility
      lines.push(track.location.replace(/\\/g, '/'))
    } else {
      lines.push(`# MISSING FILE: ${displayName}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

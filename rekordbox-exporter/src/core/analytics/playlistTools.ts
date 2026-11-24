import type { Playlist, Track } from '../common/types'
import { normalizePrimaryArtist, normalizeText, splitTitleAndMix } from '../common/normalizeText'
import { deduplicatePlaylist } from './analyzePlaylist'

function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export type PlaylistDiff = {
  playlistAName: string
  playlistBName: string
  onlyInA: Track[]
  onlyInB: Track[]
  shared: Track[]
}

function trackSignature(t: Track): string {
  const artist = normalizePrimaryArtist(t.artist)
  const { base } = splitTitleAndMix(t.name)
  return `${artist}||${base}`
}

/**
 * Merge multiple playlists into one unified playlist, optionally deduplicating tracks.
 */
export function mergePlaylists(
  playlists: Playlist[],
  mergedName = 'Merged Set',
  deduplicate = true
): Playlist {
  const combined: Playlist = {
    id: generateId(),
    name: mergedName,
    path: [mergedName],
    tracks: playlists.flatMap((p) => p.tracks)
  }
  return deduplicate ? deduplicatePlaylist(combined).playlist : combined
}

/**
 * Compare two playlists to find shared tracks and tracks exclusive to each.
 */
export function diffPlaylists(playlistA: Playlist, playlistB: Playlist): PlaylistDiff {
  const sigsA = new Set(playlistA.tracks.map(trackSignature))
  const sigsB = new Set(playlistB.tracks.map(trackSignature))

  const onlyInA: Track[] = []
  const shared: Track[] = []
  const seenShared = new Set<string>()

  for (const t of playlistA.tracks) {
    const sig = trackSignature(t)
    if (sigsB.has(sig)) {
      if (!seenShared.has(sig)) {
        seenShared.add(sig)
        shared.push(t)
      }
    } else {
      onlyInA.push(t)
    }
  }

  const onlyInB = playlistB.tracks.filter((t) => !sigsA.has(trackSignature(t)))

  return {
    playlistAName: playlistA.name,
    playlistBName: playlistB.name,
    onlyInA,
    onlyInB,
    shared
  }
}

export type BpmZone = {
  label: string
  min: number
  max: number
}

export const DEFAULT_DJ_BPM_ZONES: BpmZone[] = [
  { label: 'Warm-Up (<124 BPM)', min: 0, max: 123.99 },
  { label: 'Groove (124-131 BPM)', min: 124, max: 131.99 },
  { label: 'Peak Time (132-139 BPM)', min: 132, max: 139.99 },
  { label: 'Hard / Closing (140+ BPM)', min: 140, max: 999 }
]

/**
 * Split a playlist into DJ energy/BPM zone playlists.
 * Tracks without BPM go into an "Unknown BPM" bucket if present.
 */
export function splitPlaylistByBpm(
  playlist: Playlist,
  zones: BpmZone[] = DEFAULT_DJ_BPM_ZONES
): Playlist[] {
  const buckets = zones.map((z) => ({ zone: z, tracks: [] as Track[] }))
  const unknown: Track[] = []

  for (const t of playlist.tracks) {
    if (!t.bpm || t.bpm <= 0) {
      unknown.push(t)
      continue
    }
    const bucket = buckets.find((b) => t.bpm! >= b.zone.min && t.bpm! <= b.zone.max)
    if (bucket) bucket.tracks.push(t)
    else unknown.push(t)
  }

  const result: Playlist[] = []
  for (const b of buckets) {
    if (b.tracks.length === 0) continue
    const name = `${playlist.name} — ${b.zone.label}`
    result.push({
      id: generateId(),
      name,
      path: [...playlist.path.slice(0, -1), name],
      tracks: b.tracks
    })
  }

  if (unknown.length > 0) {
    const name = `${playlist.name} — Sin BPM`
    result.push({
      id: generateId(),
      name,
      path: [...playlist.path.slice(0, -1), name],
      tracks: unknown
    })
  }

  return result
}

/**
 * Split a playlist into sub-playlists grouped by Genre.
 */
export function splitPlaylistByGenre(playlist: Playlist): Playlist[] {
  const byGenre = new Map<string, Track[]>()
  for (const t of playlist.tracks) {
    const genre = t.genre?.trim() || 'Sin género'
    const list = byGenre.get(genre) ?? []
    list.push(t)
    byGenre.set(genre, list)
  }

  return Array.from(byGenre.entries()).map(([genre, tracks]) => {
    const name = `${playlist.name} — ${genre}`
    return {
      id: generateId(),
      name,
      path: [...playlist.path.slice(0, -1), name],
      tracks
    }
  })
}

/**
 * Automatically relocate missing tracks using an index of discovered audio file paths on disk.
 * Matches by exact filename first, then by normalized filename stem ("artist - title" or title).
 */
export function relocateTracksFromFileList(
  playlists: Playlist[],
  discoveredFiles: string[],
  existingPathsSet?: Set<string>
): { playlists: Playlist[]; relocatedCount: number } {
  const byExactName = new Map<string, string>()
  const byNormalizedStem = new Map<string, string>()

  for (const fullPath of discoveredFiles) {
    const normPath = fullPath.replace(/\\/g, '/')
    const fileName = normPath.split('/').pop() ?? ''
    if (!fileName) continue
    const lowerName = fileName.toLowerCase()
    if (!byExactName.has(lowerName)) byExactName.set(lowerName, normPath)

    const stem = normalizeText(fileName.replace(/\.[^.]+$/, ''))
    if (stem && !byNormalizedStem.has(stem)) {
      byNormalizedStem.set(stem, normPath)
    }
  }

  let relocatedCount = 0

  const nextPlaylists = playlists.map((pl) => ({
    ...pl,
    tracks: pl.tracks.map((track) => {
      // Skip if already verified existing on disk
      if (track.location && existingPathsSet?.has(track.location)) {
        return track
      }

      // 1. Exact filename match from previous broken path
      if (track.location) {
        const prevName = track.location.replace(/\\/g, '/').split('/').pop()?.toLowerCase()
        if (prevName && byExactName.has(prevName)) {
          const found = byExactName.get(prevName)!
          if (found !== track.location) {
            relocatedCount++
            return { ...track, location: found }
          }
          return track
        }
      }

      // 2. Normalized "artist - title" stem match
      const artistTitleStem = normalizeText(`${track.artist} - ${track.name}`)
      if (byNormalizedStem.has(artistTitleStem)) {
        relocatedCount++
        return { ...track, location: byNormalizedStem.get(artistTitleStem)! }
      }

      // 3. Normalized title-only stem match (only if title has >= 4 chars to avoid false positives)
      const titleStem = normalizeText(track.name)
      if (titleStem.length >= 4 && byNormalizedStem.has(titleStem)) {
        relocatedCount++
        return { ...track, location: byNormalizedStem.get(titleStem)! }
      }

      return track
    })
  }))

  return { playlists: nextPlaylists, relocatedCount }
}

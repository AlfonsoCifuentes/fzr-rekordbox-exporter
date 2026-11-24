import type { Playlist, Track } from '../common/types'
import { normalizeToCamelot } from './analyzePlaylist'

export type MetadataCleanReport = {
  playlist: Playlist
  tracksCleaned: number
  keysNormalized: number
  artistsExtracted: number
}

const NOISE_PATTERNS: RegExp[] = [
  /\[(free\s*(download|dl)|promo|master|mastered|hq|wav|flac|320\s*kbps|out\s*now|exclusive)\]/gi,
  /\((free\s*(download|dl)|320\s*kbps|master|mastered|hq|official\s*(audio|video|music\s*video))\)/gi,
  /\bwww\.[a-z0-9.-]+\.[a-z]{2,}\b/gi,
  /\.(mp3|wav|flac|aiff|aif|ogg|m4a|alac|aac)$/gi
]

function cleanStringField(raw: string): string {
  let out = raw
  for (const rx of NOISE_PATTERNS) {
    out = out.replace(rx, '')
  }
  // Convert underscore-only filenames ("Artist_Name_-_Track_Title") into readable spaces
  if (out.includes('_') && !out.includes(' ')) {
    out = out.replace(/_+/g, ' ')
  }
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * Clean messy DJ metadata across a playlist:
 * - Strips download noise tags ([FREE DOWNLOAD], (320kbps), www.*, audio extensions)
 * - Extracts "Artist - Title" when Artist is missing/unknown
 * - Normalizes keys (Am / 1m / F#m) into canonical Camelot (1A-12B)
 * - Extracts Mix/Remixer hints from title if not populated
 */
export function cleanPlaylistMetadata(playlist: Playlist): MetadataCleanReport {
  let tracksCleaned = 0
  let keysNormalized = 0
  let artistsExtracted = 0

  const nextTracks: Track[] = playlist.tracks.map((track) => {
    let changed = false
    let name = cleanStringField(track.name)
    let artist = cleanStringField(track.artist)
    let key = track.key
    let remixer = track.remixer
    let mix = track.mix

    if (name !== track.name || artist !== track.artist) {
      changed = true
    }

    // If artist is missing/unknown and title contains "Artist - Title", split it cleanly
    const unknownArtist =
      !artist || artist.toLowerCase() === '(artista desconocido)' || artist.toLowerCase() === 'unknown'
    if (unknownArtist && name.includes(' - ')) {
      const idx = name.indexOf(' - ')
      const inferredArtist = name.slice(0, idx).trim()
      const inferredTitle = name.slice(idx + 3).trim()
      if (inferredArtist && inferredTitle) {
        artist = inferredArtist
        name = inferredTitle
        artistsExtracted++
        changed = true
      }
    }

    // Normalize key to Camelot
    if (key) {
      const cam = normalizeToCamelot(key)
      if (cam && cam.code !== key) {
        key = cam.code
        keysNormalized++
        changed = true
      }
    }

    // Infer mix/remixer from trailing parentheses if empty
    const paren = name.match(/\(([^)]*(?:remix|mix|edit|rework|vip|dub))\)\s*$/i)
    if (paren) {
      const tag = paren[1].trim()
      if (!mix) {
        mix = tag
        changed = true
      }
      const rmxMatch = tag.match(/^(.+?)\s+remix$/i)
      if (rmxMatch && !remixer) {
        remixer = rmxMatch[1].trim()
        changed = true
      }
    }

    if (changed) tracksCleaned++

    return {
      ...track,
      name: name || track.name,
      artist: artist || track.artist,
      key,
      mix,
      remixer
    }
  })

  return {
    playlist: { ...playlist, tracks: nextTracks },
    tracksCleaned,
    keysNormalized,
    artistsExtracted
  }
}

export type BpmFixReport = {
  playlist: Playlist
  fixedCount: number
  medianBpm: number | null
}

/**
 * Detect and fix half-time / double-time BPM analysis errors relative to the playlist median BPM.
 * Example: a 68 BPM track inside a 136 BPM Techno set is automatically corrected to 136 BPM.
 */
export function fixHalfDoubleBpm(playlist: Playlist): BpmFixReport {
  const validBpms = playlist.tracks
    .map((t) => t.bpm)
    .filter((b): b is number => Boolean(b && b > 0))
    .sort((a, b) => a - b)

  if (validBpms.length < 3) {
    return { playlist, fixedCount: 0, medianBpm: validBpms[0] ?? null }
  }

  const median = validBpms[Math.floor(validBpms.length / 2)]
  let fixedCount = 0

  const nextTracks = playlist.tracks.map((track) => {
    if (!track.bpm || track.bpm <= 0) return track

    const doubled = track.bpm * 2
    const halved = track.bpm / 2

    const currDist = Math.abs(track.bpm - median) / median
    const doubleDist = Math.abs(doubled - median) / median
    const halfDist = Math.abs(halved - median) / median

    if (currDist > 0.25 && doubleDist <= 0.16) {
      fixedCount++
      return { ...track, bpm: Math.round(doubled * 100) / 100 }
    }
    if (currDist > 0.25 && halfDist <= 0.16) {
      fixedCount++
      return { ...track, bpm: Math.round(halved * 100) / 100 }
    }
    return track
  })

  return {
    playlist: { ...playlist, tracks: nextTracks },
    fixedCount,
    medianBpm: Math.round(median * 10) / 10
  }
}

import type { Playlist, Track } from '../common/types'
import { normalizePrimaryArtist, splitTitleAndMix } from '../common/normalizeText'

export type CamelotKey = {
  number: number // 1..12
  letter: 'A' | 'B' // A = minor, B = major
  code: string // e.g. "8A"
}

export type TransitionRating = 'perfect' | 'energy' | 'clash' | 'unknown'

export type TrackTransition = {
  fromIndex: number
  toIndex: number
  fromKey?: string
  toKey?: string
  rating: TransitionRating
  bpmDelta?: number
}

export type DuplicateGroup = {
  signature: string
  label: string
  indices: number[]
}

export type PlaylistAnalytics = {
  totalTracks: number
  totalDurationSeconds: number
  bpmMin?: number
  bpmMax?: number
  bpmAvg?: number
  bpmMedian?: number
  harmonicScore: number | null // 0..100% or null if <1 known key transitions
  compatibleTransitions: number
  energyTransitions: number
  clashTransitions: number
  transitions: TrackTransition[]
  keyDistribution: Array<{ key: string; count: number }>
  genreDistribution: Array<{ genre: string; count: number }>
  duplicates: DuplicateGroup[]
  missingBpmCount: number
  missingKeyCount: number
  missingLocationCount: number
  totalCuePoints: number
}

const KEY_TO_CAMELOT: Record<string, string> = {
  // Camelot direct
  '1a': '1A', '2a': '2A', '3a': '3A', '4a': '4A', '5a': '5A', '6a': '6A',
  '7a': '7A', '8a': '8A', '9a': '9A', '10a': '10A', '11a': '11A', '12a': '12A',
  '1b': '1B', '2b': '2B', '3b': '3B', '4b': '4B', '5b': '5B', '6b': '6B',
  '7b': '7B', '8b': '8B', '9b': '9B', '10b': '10B', '11b': '11B', '12b': '12B',
  // Open Key -> Camelot
  '6m': '1A', '7m': '2A', '8m': '3A', '9m': '4A', '10m': '5A', '11m': '6A',
  '12m': '7A', '1m': '8A', '2m': '9A', '3m': '10A', '4m': '11A', '5m': '12A',
  '6d': '1B', '7d': '2B', '8d': '3B', '9d': '4B', '10d': '5B', '11d': '6B',
  '12d': '7B', '1d': '8B', '2d': '9B', '3d': '10B', '4d': '11B', '5d': '12B',
  // Musical notation major -> Camelot
  b: '1B', 'f#': '2B', gb: '2B', db: '3B', 'c#': '3B', ab: '4B', 'g#': '4B',
  eb: '5B', 'd#': '5B', bb: '6B', 'a#': '6B', f: '7B', c: '8B', g: '9B',
  d: '10B', a: '11B', e: '12B',
  // Musical notation minor -> Camelot
  'g#m': '1A', abm: '1A', ebm: '2A', 'd#m': '2A', bbm: '3A', 'a#m': '3A',
  fm: '4A', cm: '5A', gm: '6A', dm: '7A', am: '8A', em: '9A', bm: '10A',
  'f#m': '11A', gbm: '11A', 'c#m': '12A', dbm: '12A'
}

/**
 * Normalize Camelot, Open Key, or standard musical key notation into CamelotKey.
 */
export function normalizeToCamelot(rawKey: string | undefined): CamelotKey | null {
  if (!rawKey) return null
  const cleaned = rawKey
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/maj(or)?$/, '')
    .replace(/min(or)?$/, 'm')
  const code = KEY_TO_CAMELOT[cleaned]
  if (!code) return null
  const letter = code.slice(-1) as 'A' | 'B'
  const number = parseInt(code.slice(0, -1), 10)
  return { number, letter, code }
}

/**
 * Shortest circular distance on the 12-hour Camelot wheel (0..6).
 */
function camelotWheelDiff(a: number, b: number): number {
  const diff = (b - a + 12) % 12
  return Math.min(diff, 12 - diff)
}

/**
 * Evaluate harmonic mixing compatibility between two consecutive tracks.
 */
export function evaluateHarmonicTransition(
  keyA: string | undefined,
  keyB: string | undefined
): TransitionRating {
  const a = normalizeToCamelot(keyA)
  const b = normalizeToCamelot(keyB)
  if (!a || !b) return 'unknown'

  const circularDiff = camelotWheelDiff(a.number, b.number)

  // Same key, ±1 same mode, or relative major/minor (same number A <-> B)
  if (a.letter === b.letter && circularDiff <= 1) return 'perfect'
  if (a.number === b.number && a.letter !== b.letter) return 'perfect'

  // Energy boost (+2 steps clockwise, same mode) or diagonal ±1 relative switch
  const forwardStep = (b.number - a.number + 12) % 12
  if (a.letter === b.letter && (forwardStep === 2 || forwardStep === 7)) return 'energy'
  if (a.letter !== b.letter && circularDiff === 1) return 'energy'

  return 'clash'
}

function trackDuplicateSignature(track: Track): string {
  const artist = normalizePrimaryArtist(track.artist)
  const { base } = splitTitleAndMix(track.name)
  return `${artist}||${base}`
}

/**
 * Compute comprehensive DJ analytics and library health diagnostics for a playlist.
 */
export function analyzePlaylist(playlist: Playlist): PlaylistAnalytics {
  const tracks = playlist.tracks
  const bpms: number[] = []
  let totalDurationSeconds = 0
  let missingBpmCount = 0
  let missingKeyCount = 0
  let missingLocationCount = 0
  let totalCuePoints = 0

  const keyCounts = new Map<string, number>()
  const genreCounts = new Map<string, number>()
  const dupBuckets = new Map<string, { label: string; indices: number[] }>()

  tracks.forEach((t, idx) => {
    if (t.durationSeconds && t.durationSeconds > 0) {
      totalDurationSeconds += t.durationSeconds
    }
    if (t.bpm && t.bpm > 0) {
      bpms.push(t.bpm)
    } else {
      missingBpmCount++
    }
    const cam = normalizeToCamelot(t.key)
    if (cam) {
      keyCounts.set(cam.code, (keyCounts.get(cam.code) ?? 0) + 1)
    } else {
      missingKeyCount++
    }
    if (t.genre) {
      genreCounts.set(t.genre, (genreCounts.get(t.genre) ?? 0) + 1)
    }
    if (!t.location) {
      missingLocationCount++
    }
    if (t.cuePoints) {
      totalCuePoints += t.cuePoints.length
    }

    const sig = trackDuplicateSignature(t)
    if (sig !== '||') {
      const bucket = dupBuckets.get(sig) ?? { label: `${t.artist} - ${t.name}`, indices: [] }
      bucket.indices.push(idx)
      dupBuckets.set(sig, bucket)
    }
  })

  // BPM stats
  bpms.sort((a, b) => a - b)
  const bpmMin = bpms.length > 0 ? Math.round(bpms[0] * 10) / 10 : undefined
  const bpmMax = bpms.length > 0 ? Math.round(bpms[bpms.length - 1] * 10) / 10 : undefined
  const bpmAvg =
    bpms.length > 0
      ? Math.round((bpms.reduce((sum, v) => sum + v, 0) / bpms.length) * 10) / 10
      : undefined
  const bpmMedian =
    bpms.length > 0 ? Math.round(bpms[Math.floor(bpms.length / 2)] * 10) / 10 : undefined

  // Consecutive harmonic & BPM transitions
  const transitions: TrackTransition[] = []
  let compatibleTransitions = 0
  let energyTransitions = 0
  let clashTransitions = 0

  for (let i = 0; i < tracks.length - 1; i++) {
    const a = tracks[i]
    const b = tracks[i + 1]
    const rating = evaluateHarmonicTransition(a.key, b.key)
    const bpmDelta =
      a.bpm && b.bpm ? Math.round((b.bpm - a.bpm) * 10) / 10 : undefined

    if (rating === 'perfect') compatibleTransitions++
    else if (rating === 'energy') energyTransitions++
    else if (rating === 'clash') clashTransitions++

    transitions.push({
      fromIndex: i,
      toIndex: i + 1,
      fromKey: normalizeToCamelot(a.key)?.code ?? a.key,
      toKey: normalizeToCamelot(b.key)?.code ?? b.key,
      rating,
      bpmDelta
    })
  }

  const knownTransitions = compatibleTransitions + energyTransitions + clashTransitions
  const harmonicScore =
    knownTransitions > 0
      ? Math.round(((compatibleTransitions + energyTransitions * 0.85) / knownTransitions) * 100)
      : null

  const duplicates: DuplicateGroup[] = Array.from(dupBuckets.entries())
    .filter(([, b]) => b.indices.length > 1)
    .map(([signature, b]) => ({ signature, label: b.label, indices: b.indices }))

  const keyDistribution = Array.from(keyCounts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)

  const genreDistribution = Array.from(genreCounts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalTracks: tracks.length,
    totalDurationSeconds,
    bpmMin,
    bpmMax,
    bpmAvg,
    bpmMedian,
    harmonicScore,
    compatibleTransitions,
    energyTransitions,
    clashTransitions,
    transitions,
    keyDistribution,
    genreDistribution,
    duplicates,
    missingBpmCount,
    missingKeyCount,
    missingLocationCount,
    totalCuePoints
  }
}

/**
 * Non-destructively sort a playlist's tracks for optimal DJ harmonic & BPM progression.
 * Uses a greedy path heuristic prioritizing Camelot compatibility + gentle ascending BPM.
 */
export function sortPlaylistHarmonically(playlist: Playlist): Playlist {
  if (playlist.tracks.length <= 2) return { ...playlist, tracks: [...playlist.tracks] }

  const remaining = [...playlist.tracks]

  // Pick starting track: lowest positive BPM with a known key (or lowest BPM overall)
  remaining.sort((a, b) => {
    const aHas = a.bpm && a.bpm > 0 ? 0 : 1
    const bHas = b.bpm && b.bpm > 0 ? 0 : 1
    if (aHas !== bHas) return aHas - bHas
    return (a.bpm ?? 999) - (b.bpm ?? 999)
  })

  const ordered: Track[] = [remaining.shift()!]

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1]
    let bestIdx = 0
    let bestCost = Number.POSITIVE_INFINITY

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i]
      const rating = evaluateHarmonicTransition(current.key, cand.key)
      let keyCost = 18
      if (rating === 'perfect') keyCost = 0
      else if (rating === 'energy') keyCost = 6
      else if (rating === 'unknown') keyCost = 12
      else keyCost = 30

      let bpmCost = 5
      if (current.bpm && cand.bpm) {
        const delta = cand.bpm - current.bpm
        // Gentle upward tempo progression (0..+4 BPM) is ideal in DJ sets
        if (delta >= 0 && delta <= 4) bpmCost = delta * 0.8
        else if (delta < 0 && delta >= -3) bpmCost = Math.abs(delta) * 1.4
        else bpmCost = Math.abs(delta) * 2.5
      }

      const cost = keyCost + bpmCost
      if (cost < bestCost) {
        bestCost = cost
        bestIdx = i
      }
    }

    ordered.push(remaining.splice(bestIdx, 1)[0])
  }

  return { ...playlist, tracks: ordered }
}

/**
 * Remove duplicate tracks from a playlist while preserving first-seen order.
 */
export function deduplicatePlaylist(playlist: Playlist): {
  playlist: Playlist
  removedCount: number
} {
  const seen = new Set<string>()
  const unique: Track[] = []
  let removedCount = 0

  for (const track of playlist.tracks) {
    const sig = trackDuplicateSignature(track)
    if (sig !== '||' && seen.has(sig)) {
      removedCount++
      continue
    }
    seen.add(sig)
    unique.push(track)
  }

  return { playlist: { ...playlist, tracks: unique }, removedCount }
}

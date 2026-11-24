import { describe, it, expect } from 'vitest'
import {
  normalizeToCamelot,
  evaluateHarmonicTransition,
  analyzePlaylist,
  sortPlaylistHarmonically,
  deduplicatePlaylist
} from '../../core/analytics/analyzePlaylist'
import type { Playlist } from '../../core/common/types'

const messyPlaylist: Playlist = {
  id: 'pl-messy',
  name: 'Messy Techno Set',
  path: ['Messy Techno Set'],
  tracks: [
    { internalId: '1', artist: 'Artist A', name: 'Track One (Extended Mix)', bpm: 138, key: '8A', durationSeconds: 360 },
    { internalId: '2', artist: 'Artist B', name: 'Track Two', bpm: 130, key: '2A', durationSeconds: 300 },
    { internalId: '3', artist: 'Artist C', name: 'Track Three', bpm: 134, key: '9A', durationSeconds: 330 },
    { internalId: '4', artist: 'Artist D', name: 'Track Four', bpm: 132, key: '1A', durationSeconds: 320 },
    { internalId: '5', artist: 'Artist A', name: 'Track One (Radio Edit)', bpm: 138, key: '8A', durationSeconds: 210 }
  ]
}

describe('DJ set analyzer & Camelot harmonic engine', () => {
  it('normalizes Camelot, Open Key, and musical notation into Camelot codes', () => {
    expect(normalizeToCamelot('Am')?.code).toBe('8A')
    expect(normalizeToCamelot('1m')?.code).toBe('8A')
    expect(normalizeToCamelot('C')?.code).toBe('8B')
    expect(normalizeToCamelot('F#m')?.code).toBe('11A')
    expect(normalizeToCamelot('12B')?.code).toBe('12B')
    expect(normalizeToCamelot('unknown')).toBeNull()
  })

  it('evaluates harmonic transitions accurately', () => {
    expect(evaluateHarmonicTransition('8A', '8A')).toBe('perfect')
    expect(evaluateHarmonicTransition('8A', '9A')).toBe('perfect')
    expect(evaluateHarmonicTransition('12A', '1A')).toBe('perfect')
    expect(evaluateHarmonicTransition('8A', '8B')).toBe('perfect')
    expect(evaluateHarmonicTransition('8A', '10A')).toBe('energy')
    expect(evaluateHarmonicTransition('8A', '2A')).toBe('clash')
  })

  it('analyzes BPM stats, harmonic flow, and detects near-duplicates', () => {
    const stats = analyzePlaylist(messyPlaylist)
    expect(stats.totalTracks).toBe(5)
    expect(stats.bpmMin).toBe(130)
    expect(stats.bpmMax).toBe(138)
    expect(stats.duplicates).toHaveLength(1)
    expect(stats.duplicates[0].indices).toEqual([0, 4])
    expect(stats.harmonicScore).not.toBeNull()
  })

  it('improves harmonic compatibility when auto-sorted with Camelot + BPM', () => {
    const before = analyzePlaylist(messyPlaylist)
    const sorted = sortPlaylistHarmonically(messyPlaylist)
    const after = analyzePlaylist(sorted)

    expect(sorted.tracks).toHaveLength(messyPlaylist.tracks.length)
    expect(after.harmonicScore!).toBeGreaterThanOrEqual(before.harmonicScore!)
  })

  it('removes duplicate tracks while preserving first occurrence', () => {
    const { playlist, removedCount } = deduplicatePlaylist(messyPlaylist)
    expect(removedCount).toBe(1)
    expect(playlist.tracks).toHaveLength(4)
    expect(playlist.tracks[0].name).toBe('Track One (Extended Mix)')
  })
})

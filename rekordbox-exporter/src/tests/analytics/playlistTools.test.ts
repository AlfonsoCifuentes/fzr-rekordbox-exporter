import { describe, it, expect } from 'vitest'
import {
  mergePlaylists,
  diffPlaylists,
  splitPlaylistByBpm,
  splitPlaylistByGenre,
  relocateTracksFromFileList
} from '../../core/analytics/playlistTools'
import type { Playlist } from '../../core/common/types'

const plA: Playlist = {
  id: 'a',
  name: 'Set A',
  path: ['Set A'],
  tracks: [
    { internalId: '1', artist: 'Artist 1', name: 'Warm Track', genre: 'House', bpm: 120, location: 'C:/Old/Warm Track.mp3' },
    { internalId: '2', artist: 'Artist 2', name: 'Peak Track', genre: 'Techno', bpm: 136, location: 'C:/Old/Peak Track.wav' }
  ]
}

const plB: Playlist = {
  id: 'b',
  name: 'Set B',
  path: ['Set B'],
  tracks: [
    { internalId: '3', artist: 'Artist 2', name: 'Peak Track (Extended Mix)', genre: 'Techno', bpm: 136 },
    { internalId: '4', artist: 'Artist 3', name: 'Hard Closing', genre: 'Hard Techno', bpm: 145 }
  ]
}

describe('playlistTools', () => {
  it('merges multiple playlists and deduplicates overlapping tracks', () => {
    const merged = mergePlaylists([plA, plB], 'Full Night', true)
    expect(merged.name).toBe('Full Night')
    expect(merged.tracks).toHaveLength(3)
  })

  it('diffs two playlists into onlyInA, shared, and onlyInB', () => {
    const diff = diffPlaylists(plA, plB)
    expect(diff.onlyInA).toHaveLength(1)
    expect(diff.shared).toHaveLength(1)
    expect(diff.onlyInB).toHaveLength(1)
    expect(diff.shared[0].name).toBe('Peak Track')
  })

  it('splits a playlist into BPM energy zones', () => {
    const merged = mergePlaylists([plA, plB], 'Master', true)
    const zones = splitPlaylistByBpm(merged)
    expect(zones).toHaveLength(3) // Warm-Up (120), Peak Time (136), Hard (145)
  })

  it('splits a playlist by genre', () => {
    const merged = mergePlaylists([plA, plB], 'Master', true)
    const genres = splitPlaylistByGenre(merged)
    expect(genres).toHaveLength(3)
  })

  it('relocates missing tracks from discovered audio files by exact filename and normalized Artist - Title', () => {
    const discovered = [
      'D:\\NewDrive\\House\\Warm Track.mp3',
      'D:\\NewDrive\\Techno\\Artist 3 - Hard Closing.flac'
    ]
    const { playlists, relocatedCount } = relocateTracksFromFileList([plA, plB], discovered)
    expect(relocatedCount).toBe(2)
    expect(playlists[0].tracks[0].location).toBe('D:/NewDrive/House/Warm Track.mp3')
    expect(playlists[1].tracks[1].location).toBe('D:/NewDrive/Techno/Artist 3 - Hard Closing.flac')
  })
})

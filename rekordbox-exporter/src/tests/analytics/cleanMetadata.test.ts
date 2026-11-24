import { describe, it, expect } from 'vitest'
import { cleanPlaylistMetadata, fixHalfDoubleBpm } from '../../core/analytics/cleanMetadata'
import type { Playlist } from '../../core/common/types'

describe('cleanPlaylistMetadata & fixHalfDoubleBpm', () => {
  it('strips DJ noise tags, extracts Artist - Title, infers remixer, and normalizes keys to Camelot', () => {
    const dirty: Playlist = {
      id: 'p1',
      name: 'Dirty Crate',
      path: ['Dirty Crate'],
      tracks: [
        {
          internalId: '1',
          artist: '(artista desconocido)',
          name: 'Joey Beltram - Energy Flash (Tale Of Us Remix) [FREE DOWNLOAD] (320kbps).mp3',
          key: 'Am'
        },
        {
          internalId: '2',
          artist: 'Artist_Two',
          name: 'Acid_Rain www.djpool.com',
          key: '1m'
        }
      ]
    }

    const rep = cleanPlaylistMetadata(dirty)
    expect(rep.tracksCleaned).toBe(2)
    expect(rep.artistsExtracted).toBe(1)
    expect(rep.keysNormalized).toBe(2)

    expect(rep.playlist.tracks[0]).toMatchObject({
      artist: 'Joey Beltram',
      name: 'Energy Flash (Tale Of Us Remix)',
      remixer: 'Tale Of Us',
      mix: 'Tale Of Us Remix',
      key: '8A'
    })
    expect(rep.playlist.tracks[1]).toMatchObject({
      artist: 'Artist Two',
      name: 'Acid_Rain',
      key: '8A'
    })
  })

  it('detects and fixes half-time and double-time BPM outliers against playlist median', () => {
    const set: Playlist = {
      id: 'p2',
      name: 'Techno 136',
      path: ['Techno 136'],
      tracks: [
        { internalId: '1', artist: 'A', name: 'T1', bpm: 136 },
        { internalId: '2', artist: 'B', name: 'T2', bpm: 138 },
        { internalId: '3', artist: 'C', name: 'T3', bpm: 68 }, // half-time bug!
        { internalId: '4', artist: 'D', name: 'T4', bpm: 134 },
        { internalId: '5', artist: 'E', name: 'T5', bpm: 272 } // double-time bug!
      ]
    }

    const rep = fixHalfDoubleBpm(set)
    expect(rep.fixedCount).toBe(2)
    expect(rep.playlist.tracks[2].bpm).toBe(136)
    expect(rep.playlist.tracks[4].bpm).toBe(136)
  })
})

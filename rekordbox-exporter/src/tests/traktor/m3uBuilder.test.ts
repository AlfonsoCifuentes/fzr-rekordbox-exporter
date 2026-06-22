import { describe, it, expect } from 'vitest'
import { buildM3U8 } from '../../core/traktor/m3uBuilder'
import type { Playlist } from '../../core/common/types'

const mockPlaylist: Playlist = {
  id: 'test-id',
  name: 'Test Playlist',
  path: ['Test Playlist'],
  tracks: [
    {
      internalId: '1',
      name: 'Track One',
      artist: 'Artist A',
      durationSeconds: 360,
      location: 'C:/Music/track1.mp3'
    },
    {
      internalId: '2',
      name: 'Track Two',
      artist: 'Artist B',
      durationSeconds: 420,
      location: undefined
    }
  ]
}

describe('buildM3U8', () => {
  it('starts with #EXTM3U header', () => {
    const m3u = buildM3U8(mockPlaylist)
    expect(m3u.startsWith('#EXTM3U')).toBe(true)
  })

  it('includes #EXTINF with duration and artist - title', () => {
    const m3u = buildM3U8(mockPlaylist)
    expect(m3u).toContain('#EXTINF:360,Artist A - Track One')
  })

  it('includes file path with forward slashes', () => {
    const m3u = buildM3U8(mockPlaylist)
    expect(m3u).toContain('C:/Music/track1.mp3')
  })

  it('marks missing file as comment', () => {
    const m3u = buildM3U8(mockPlaylist)
    expect(m3u).toContain('# MISSING FILE: Artist B - Track Two')
  })

  it('preserves track order', () => {
    const m3u = buildM3U8(mockPlaylist)
    const idx1 = m3u.indexOf('Track One')
    const idx2 = m3u.indexOf('Track Two')
    expect(idx1).toBeLessThan(idx2)
  })
})

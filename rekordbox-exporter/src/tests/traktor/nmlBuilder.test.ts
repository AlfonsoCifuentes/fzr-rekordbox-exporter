import { describe, it, expect } from 'vitest'
import { buildNml } from '../../core/traktor/nmlBuilder'
import type { Track } from '../../core/common/types'

const tracks: Track[] = [
  {
    internalId: '1',
    name: 'Test Track',
    artist: 'Artist A',
    album: 'Album X',
    genre: 'Techno',
    bpm: 130,
    durationSeconds: 360,
    location: 'C:/Music/Artist A/Test Track.mp3'
  }
]

describe('buildNml', () => {
  it('generates valid XML starting with NML tag', () => {
    const nml = buildNml('My Playlist', tracks)
    expect(nml).toContain('<?xml version="1.0"')
    expect(nml).toContain('<NML VERSION="19">')
  })

  it('includes COLLECTION with correct ENTRIES count', () => {
    const nml = buildNml('My Playlist', tracks)
    expect(nml).toContain('COLLECTION ENTRIES="1"')
  })

  it('includes track title and artist', () => {
    const nml = buildNml('My Playlist', tracks)
    expect(nml).toContain('TITLE="Test Track"')
    expect(nml).toContain('ARTIST="Artist A"')
  })

  it('includes playlist name', () => {
    const nml = buildNml('My Playlist', tracks)
    expect(nml).toContain('NAME="My Playlist"')
  })

  it('escapes XML entities in names', () => {
    const dangerousTracks: Track[] = [{
      internalId: '2',
      name: 'Track & "Special" <one>',
      artist: 'Artist\'s Name',
      location: 'C:/Music/track.mp3'
    }]
    const nml = buildNml('Playlist & More', dangerousTracks)
    expect(nml).toContain('Track &amp; &quot;Special&quot; &lt;one&gt;')
    expect(nml).toContain('Playlist &amp; More')
  })

  it('handles tracks with no location', () => {
    const noLocTracks: Track[] = [{
      internalId: '3',
      name: 'No Location Track',
      artist: 'Artist',
      location: undefined
    }]
    expect(() => buildNml('Test', noLocTracks)).not.toThrow()
  })
})

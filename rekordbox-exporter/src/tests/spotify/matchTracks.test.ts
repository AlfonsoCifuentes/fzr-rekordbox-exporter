import { describe, it, expect } from 'vitest'
import {
  buildSearchQueries,
  scoreCandidate,
  classifyMatch,
  buildTrackFingerprint,
  type RawSpotifyTrack
} from '../../core/spotify/matchTracks'
import type { Track } from '../../core/common/types'

const sampleTrack: Track = {
  internalId: 'trk-1',
  name: 'Energy Flash (Original Mix) [FREE DOWNLOAD]',
  artist: 'Joey Beltram',
  album: 'Classics',
  year: 1990,
  durationSeconds: 348
}

const exactSpotifyItem: RawSpotifyTrack = {
  id: 'sp-1',
  uri: 'spotify:track:sp-1',
  name: 'Energy Flash - Original Mix',
  artists: [{ name: 'Joey Beltram' }],
  album: { name: 'Classics', release_date: '1990-05-01' },
  duration_ms: 349000,
  external_urls: { spotify: 'https://open.spotify.com/track/sp-1' }
}

const wrongTrackItem: RawSpotifyTrack = {
  id: 'sp-2',
  uri: 'spotify:track:sp-2',
  name: 'Totally Different Song',
  artists: [{ name: 'Other Artist' }],
  album: { name: 'Unrelated', release_date: '2022-01-01' },
  duration_ms: 180000
}

describe('Spotify matching engine', () => {
  it('builds a clean multi-query waterfall stripping DJ noise tags', () => {
    const queries = buildSearchQueries(sampleTrack)
    expect(queries.length).toBeGreaterThanOrEqual(3)
    expect(queries[0]).not.toContain('free download')
    expect(queries.some((q) => q.includes('energy flash'))).toBe(true)
    expect(queries.some((q) => q.includes('joey beltram'))).toBe(true)
  })

  it('scores an exact match very high (>= 90) and classifies as matched', () => {
    const scored = scoreCandidate(sampleTrack, exactSpotifyItem)
    expect(scored.score).toBeGreaterThanOrEqual(90)

    const result = classifyMatch(sampleTrack, [wrongTrackItem, exactSpotifyItem])
    expect(result.status).toBe('matched')
    expect(result.spotifyTrackId).toBe('sp-1')
    expect(result.candidates[0].spotifyTrackId).toBe('sp-1')
  })

  it('classifies unrelated candidates as not_found', () => {
    const result = classifyMatch(sampleTrack, [wrongTrackItem])
    expect(result.status).toBe('not_found')
    expect(result.spotifyUri).toBeUndefined()
  })

  it('penalizes wrong remix when a specific remixer is requested', () => {
    const remixTrack: Track = {
      internalId: 'trk-2',
      name: 'Strings of Life (Danny Krivit Remix)',
      artist: 'Rhythim Is Rhythim',
      remixer: 'Danny Krivit',
      durationSeconds: 450
    }
    const originalCand: RawSpotifyTrack = {
      id: 'orig',
      uri: 'spotify:track:orig',
      name: 'Strings of Life',
      artists: [{ name: 'Rhythim Is Rhythim' }],
      album: { name: 'Strings' },
      duration_ms: 450000
    }
    const remixCand: RawSpotifyTrack = {
      id: 'rmx',
      uri: 'spotify:track:rmx',
      name: 'Strings of Life - Danny Krivit Remix',
      artists: [{ name: 'Rhythim Is Rhythim' }, { name: 'Danny Krivit' }],
      album: { name: 'Strings' },
      duration_ms: 451000
    }
    const result = classifyMatch(remixTrack, [originalCand, remixCand])
    expect(result.spotifyTrackId).toBe('rmx')
  })

  it('generates consistent normalized fingerprints', () => {
    const fp1 = buildTrackFingerprint({ internalId: 'a', name: 'Café del Mar (320kbps)', artist: 'Energy 52', durationSeconds: 420 })
    const fp2 = buildTrackFingerprint({ internalId: 'b', name: 'Cafe del Mar', artist: 'energy 52', durationSeconds: 420 })
    expect(fp1).toBe(fp2)
  })
})

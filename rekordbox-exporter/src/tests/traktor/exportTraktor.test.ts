import { describe, it, expect } from 'vitest'
import { exportPlaylist } from '../../core/traktor/exportTraktor'
import type { Playlist, SpotifyMatch } from '../../core/common/types'

const playlist: Playlist = {
  id: 'pl-1',
  name: 'Techno Night',
  path: ['ROOT', 'Club', 'Techno Night'],
  tracks: [
    {
      internalId: 't1',
      name: 'Track One',
      artist: 'Artist A',
      bpm: 132,
      key: '8A',
      durationSeconds: 360,
      location: 'C:/Exports/Techno Night/audio/track1.mp3'
    },
    {
      internalId: 't2',
      name: 'Promo Bootleg',
      artist: 'Unknown DJ',
      durationSeconds: 400,
      location: undefined
    }
  ]
}

describe('exportPlaylist', () => {
  it('generates M3U8, NML, and unified JSON/CSV reports including Spotify matches', () => {
    const spotifyMatches = new Map<string, SpotifyMatch>([
      [
        't1',
        {
          sourceTrackId: 't1',
          sourceTitle: 'Track One',
          sourceArtist: 'Artist A',
          spotifyTrackId: 'sp1',
          spotifyUri: 'spotify:track:sp1',
          title: 'Track One',
          artists: ['Artist A'],
          confidence: 96,
          status: 'matched',
          candidates: []
        }
      ],
      [
        't2',
        {
          sourceTrackId: 't2',
          sourceTitle: 'Promo Bootleg',
          sourceArtist: 'Unknown DJ',
          confidence: 0,
          status: 'not_found',
          candidates: []
        }
      ]
    ])

    const output = exportPlaylist(playlist, {
      outputDir: 'C:/Exports/Techno Night',
      exportM3U8: true,
      exportNml: true,
      relativeM3uPaths: true,
      spotifyMatches,
      spotifyPlaylistUrl: 'https://open.spotify.com/playlist/abc123'
    })

    expect(output.m3u8Content).toContain('audio/track1.mp3')
    expect(output.nmlContent).toContain('DIR="/:Exports/:Techno Night/:audio/:"')
    expect(output.result.missingFilesCount).toBe(1)
    expect(output.result.matchedTracks).toBe(1)
    expect(output.result.notFoundTracks).toBe(1)

    const report = JSON.parse(output.reportJson)
    expect(report.spotify.url).toBe('https://open.spotify.com/playlist/abc123')
    expect(report.tracks[0].spotifyStatus).toBe('matched')
    expect(report.tracks[1].spotifyStatus).toBe('not_found')

    expect(output.reportCsv).toContain('spotify:track:sp1')
    expect(output.reportCsv).toContain('Ruta de archivo no disponible')
  })
})

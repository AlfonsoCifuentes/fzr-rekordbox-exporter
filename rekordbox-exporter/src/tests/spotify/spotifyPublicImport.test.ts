import { describe, it, expect } from 'vitest'
import {
  extractSpotifyPlaylistId,
  parseSpotifyEmbedHtml
} from '../../core/spotify/spotifyPublicImport'

describe('spotifyPublicImport', () => {
  it('extracts 22-char Spotify playlist IDs from URLs, URIs, and raw IDs', () => {
    expect(
      extractSpotifyPlaylistId('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM3M?si=abc123')
    ).toBe('37i9dQZF1DXcBWIGoYBM3M')
    expect(extractSpotifyPlaylistId('spotify:playlist:1RQRXlLWE9KYVJPIkJvayL')).toBe(
      '1RQRXlLWE9KYVJPIkJvayL'
    )
    expect(extractSpotifyPlaylistId('37i9dQZF1DXcBWIGoYBM3M')).toBe('37i9dQZF1DXcBWIGoYBM3M')
    expect(extractSpotifyPlaylistId('https://example.com/not-spotify')).toBeNull()
  })

  it('parses playlist name and tracks from Spotify embed __NEXT_DATA__ HTML', () => {
    const sampleHtml = `
      <html><body>
      <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
        props: {
          pageProps: {
            state: {
              data: {
                entity: {
                  name: 'Berlin Peak Techno',
                  trackList: [
                    { title: 'Feel It', subtitle: 'Amelie Lens', duration: 342000 },
                    { title: 'Propaganda', subtitle: 'Dax\u00a0J', duration: 318000 }
                  ]
                }
              }
            }
          }
        }
      })}</script>
      </body></html>
    `
    const parsed = parseSpotifyEmbedHtml(sampleHtml, '37i9dQZF1DXcBWIGoYBM3M')
    expect(parsed.playlists).toHaveLength(1)
    expect(parsed.playlists[0].name).toBe('Berlin Peak Techno')
    expect(parsed.tracks).toHaveLength(2)
    expect(parsed.tracks[0]).toMatchObject({
      artist: 'Amelie Lens',
      name: 'Feel It',
      durationSeconds: 342
    })
    expect(parsed.tracks[1].artist).toBe('Dax J')
  })

  it('throws a friendly error when HTML has no tracks', () => {
    expect(() => parseSpotifyEmbedHtml('<html><body>Private</body></html>', '1234567890123456789012')).toThrow(
      /pública/i
    )
  })
})

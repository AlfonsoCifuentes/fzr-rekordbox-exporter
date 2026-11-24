import { describe, it, expect } from 'vitest'
import { parsePlaylistCsv } from '../../core/rekordbox/parsePlaylistCsv'
import { detectFormat } from '../../core/rekordbox/parseRekordboxFile'

describe('parsePlaylistCsv', () => {
  it('detects .csv format in detectFormat', () => {
    expect(detectFormat('exportify_playlist.csv')).toBe('csv')
  })

  it('parses Exportify Spotify CSV with quoted commas, ms duration, and semicolon multi-artists', () => {
    const csv = `\uFEFFTrack Name,Artist Name(s),Album Name,Release Date,Duration (ms),Tempo,Key,Genres
"Strings of Life, Original","Rhythim Is Rhythim;Derrick May","Classics",1987-01-01,450000,128.5,1A,"detroit techno, house"
"Energy Flash","Joey Beltram","R&S Classics",1990-05-01,348000,132,8A,techno`

    const res = parsePlaylistCsv(csv, 'Detroit Classics.csv')
    expect(res.playlists).toHaveLength(1)
    expect(res.playlists[0].name).toBe('Detroit Classics')
    expect(res.tracks).toHaveLength(2)

    expect(res.tracks[0]).toMatchObject({
      name: 'Strings of Life, Original',
      artist: 'Rhythim Is Rhythim, Derrick May',
      album: 'Classics',
      durationSeconds: 450,
      bpm: 128.5,
      key: '1A',
      year: 1987,
      genre: 'detroit techno'
    })
  })

  it('parses semicolon-delimited CSV with M:SS duration', () => {
    const csv = `Title;Artist;BPM;Duration\nAcid Rain;DJ Test;136;6:15`
    const res = parsePlaylistCsv(csv, 'acid.csv')
    expect(res.tracks).toHaveLength(1)
    expect(res.tracks[0].durationSeconds).toBe(375)
    expect(res.tracks[0].bpm).toBe(136)
  })
})

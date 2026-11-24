import { describe, it, expect } from 'vitest'
import {
  buildDjSetlistTxt,
  buildDjSetlistMarkdown,
  buildStreamingCsv,
  buildCueSheet,
  remapPlaylistPaths
} from '../../core/export/extraExporters'
import type { Playlist } from '../../core/common/types'

const pl: Playlist = {
  id: 'p1',
  name: 'Sunset House',
  path: ['Sunset House'],
  tracks: [
    {
      internalId: '1',
      artist: 'Kerri Chandler',
      name: 'Atmosphere',
      album: 'Classics',
      genre: 'Deep House',
      bpm: 124,
      key: 'Am',
      durationSeconds: 360,
      location: '/Volumes/OldUSB/House/Atmosphere.wav'
    },
    {
      internalId: '2',
      artist: 'Larry Heard',
      name: 'Can You Feel It',
      bpm: 122,
      key: '8A',
      durationSeconds: 330,
      location: '/Volumes/OldUSB/House/Can You Feel It.flac'
    }
  ]
}

describe('extraExporters & path remapper', () => {
  it('builds timestamped DJ setlist TXT with Camelot keys and BPM', () => {
    const txt = buildDjSetlistTxt(pl)
    expect(txt).toContain('01. [00:00] Kerri Chandler - Atmosphere [124 BPM | 8A]')
    expect(txt).toContain('02. [06:00] Larry Heard - Can You Feel It [122 BPM | 8A]')
  })

  it('builds Markdown setlist with summary stats and track table', () => {
    const md = buildDjSetlistMarkdown(pl)
    expect(md).toContain('# Sunset House')
    expect(md).toContain('Harmonic Compatibility:** 100%')
    expect(md).toContain('| 1 | 00:00 | Kerri Chandler | Atmosphere | 124 | 8A | 06:00 |')
  })

  it('builds universal streaming CSV', () => {
    const csv = buildStreamingCsv(pl)
    expect(csv).toContain('title,artist,album,duration_seconds,bpm,key,genre')
    expect(csv).toContain('Atmosphere,Kerri Chandler,Classics,360,124,8A,Deep House')
  })

  it('builds standard DJ CUE sheet (.cue) with INDEX 01 timestamps', () => {
    const cue = buildCueSheet(pl)
    expect(cue).toContain('TITLE "Sunset House"')
    expect(cue).toContain('TRACK 01 AUDIO')
    expect(cue).toContain('PERFORMER "Kerri Chandler"')
    expect(cue).toContain('INDEX 01 00:00:00')
    expect(cue).toContain('TRACK 02 AUDIO')
    expect(cue).toContain('INDEX 01 06:00:00')
  })

  it('remaps path prefixes across playlists cleanly', () => {
    const { playlists, remappedCount } = remapPlaylistPaths([pl], '/Volumes/OldUSB', 'D:/DJ_Music')
    expect(remappedCount).toBe(2)
    expect(playlists[0].tracks[0].location).toBe('D:/DJ_Music/House/Atmosphere.wav')
    expect(playlists[0].tracks[1].location).toBe('D:/DJ_Music/House/Can You Feel It.flac')
  })
})

import { describe, it, expect } from 'vitest'
import { buildNml } from '../../core/traktor/nmlBuilder'
import { parseTraktorNml, traktorLocationToPath } from '../../core/traktor/parseTraktorNml'
import { detectFormat } from '../../core/rekordbox/parseRekordboxFile'
import type { Track } from '../../core/common/types'

const sampleTracks: Track[] = [
  {
    internalId: '1',
    name: 'Energy Flash',
    artist: 'Joey Beltram',
    album: 'Classics',
    genre: 'Techno',
    bpm: 132,
    key: '8A',
    year: 1990,
    bitrate: 320,
    durationSeconds: 348,
    location: 'C:/Music/Techno/Energy Flash.mp3',
    cuePoints: [
      { name: 'Intro', type: 0, startMs: 16000, hotCueIndex: 0 },
      { name: 'Break Loop', type: 4, startMs: 120000, endMs: 128000, hotCueIndex: 1 }
    ]
  },
  {
    internalId: '2',
    name: 'Strings of Life',
    artist: 'Rhythim Is Rhythim',
    bpm: 128,
    key: '1A',
    durationSeconds: 450,
    location: 'C:/Music/Detroit/Strings of Life.flac'
  }
]

describe('parseTraktorNml', () => {
  it('detects .nml format in detectFormat', () => {
    expect(detectFormat('traktor_set.nml')).toBe('nml')
  })

  it('reconstructs Windows and macOS paths from Traktor LOCATION', () => {
    expect(traktorLocationToPath('C:', '/:Music/:Techno/:', 'Track.mp3')).toBe(
      'C:/Music/Techno/Track.mp3'
    )
    expect(traktorLocationToPath('DJUSB', '/:Sets/:', 'Track.wav')).toBe(
      '/Volumes/DJUSB/Sets/Track.wav'
    )
  })

  it('round-trips buildNml -> parseTraktorNml preserving tracks, keys, BPM, paths, and cues', () => {
    const nml = buildNml('Club Techno', sampleTracks)
    const parsed = parseTraktorNml(nml, 'club.nml')

    expect(parsed.tracks).toHaveLength(2)
    expect(parsed.playlists).toHaveLength(1)
    expect(parsed.playlists[0].name).toBe('Club Techno')
    expect(parsed.playlists[0].tracks).toHaveLength(2)

    const t0 = parsed.playlists[0].tracks[0]
    expect(t0.name).toBe('Energy Flash')
    expect(t0.artist).toBe('Joey Beltram')
    expect(t0.album).toBe('Classics')
    expect(t0.bpm).toBe(132)
    expect(t0.key).toBe('8A')
    expect(t0.location).toBe('C:/Music/Techno/Energy Flash.mp3')
    expect(t0.cuePoints).toHaveLength(2)
    expect(t0.cuePoints![0]).toMatchObject({ name: 'Intro', type: 0, startMs: 16000, hotCueIndex: 0 })
    expect(t0.cuePoints![1]).toMatchObject({
      name: 'Break Loop',
      type: 4,
      startMs: 120000,
      endMs: 128000,
      hotCueIndex: 1
    })
  })

  it('throws on invalid NML without <NML> root', () => {
    expect(() => parseTraktorNml('<OTHER/>')).toThrow(/Traktor NML/)
  })
})

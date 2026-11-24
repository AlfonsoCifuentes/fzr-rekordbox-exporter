import { describe, it, expect } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import {
  buildNml,
  pathToTraktorLocation,
  mapKeyToTraktorValue
} from '../../core/traktor/nmlBuilder'
import type { Track } from '../../core/common/types'

const tracks: Track[] = [
  {
    internalId: '1',
    name: 'Test Track',
    artist: 'Artist A',
    album: 'Album X',
    genre: 'Techno',
    bpm: 130,
    key: '1A',
    year: 2024,
    bitrate: 320,
    fileSize: 1024 * 8000,
    durationSeconds: 360,
    location: 'C:/Music/Artist A/Test Track.mp3',
    cuePoints: [
      { name: 'Drop', type: 0, startMs: 32000, hotCueIndex: 0 },
      { name: 'Loop 1', type: 4, startMs: 64000, endMs: 72000, hotCueIndex: 1 }
    ]
  }
]

describe('pathToTraktorLocation', () => {
  it('formats Windows paths into exact Traktor NML DIR, VOLUME and PRIMARYKEY', () => {
    const loc = pathToTraktorLocation('C:\\Music\\Artist A\\Test Track.mp3')
    expect(loc.volume).toBe('C:')
    expect(loc.dir).toBe('/:Music/:Artist A/:')
    expect(loc.file).toBe('Test Track.mp3')
    expect(loc.primaryKey).toBe('C:/:Music/:Artist A/:Test Track.mp3')
  })

  it('formats macOS /Volumes paths properly', () => {
    const loc = pathToTraktorLocation('/Volumes/DJUSB/Techno/Track.wav')
    expect(loc.volume).toBe('DJUSB')
    expect(loc.dir).toBe('/:Techno/:')
    expect(loc.file).toBe('Track.wav')
    expect(loc.primaryKey).toBe('DJUSB/:Techno/:Track.wav')
  })
})

describe('mapKeyToTraktorValue', () => {
  it('maps Camelot and musical keys to Traktor Open Key integers', () => {
    expect(mapKeyToTraktorValue('8B')).toBe(0) // C major
    expect(mapKeyToTraktorValue('8A')).toBe(21) // A minor
    expect(mapKeyToTraktorValue('1A')).toBe(20) // G# minor
    expect(mapKeyToTraktorValue('Am')).toBe(21)
    expect(mapKeyToTraktorValue('F#m')).toBe(18)
  })
})

describe('buildNml', () => {
  it('generates valid XML starting with NML tag and parses cleanly', () => {
    const nml = buildNml('My Playlist', tracks)
    expect(nml).toContain('<?xml version="1.0"')
    expect(nml).toContain('<NML VERSION="19">')

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
    const parsed = parser.parse(nml)
    expect(String(parsed.NML.VERSION)).toBe('19')
    expect(String(parsed.NML.COLLECTION.ENTRIES)).toBe('1')
  })

  it('includes valid Traktor LOCATION, PRIMARYKEY, ALBUM, MUSICAL_KEY and CUE_V2', () => {
    const nml = buildNml('My Playlist', tracks)
    expect(nml).toContain('DIR="/:Music/:Artist A/:"')
    expect(nml).toContain('FILE="Test Track.mp3"')
    expect(nml).toContain('VOLUME="C:"')
    expect(nml).toContain('KEY="C:/:Music/:Artist A/:Test Track.mp3"')
    expect(nml).toContain('<ALBUM TITLE="Album X"/>')
    expect(nml).toContain('<MUSICAL_KEY VALUE="20"/>')
    expect(nml).toContain('<CUE_V2 NAME="Drop" DISPL_ORDER="0" TYPE="0" START="32000.000000" LEN="0.000000" REPEATS="-1" HOTCUE="0"/>')
    expect(nml).toContain('<CUE_V2 NAME="Loop 1" DISPL_ORDER="1" TYPE="5" START="64000.000000" LEN="8000.000000" REPEATS="-1" HOTCUE="1"/>')
  })

  it('deduplicates COLLECTION entries when same track appears twice in playlist', () => {
    const nml = buildNml('Dup Playlist', [tracks[0], tracks[0]])
    expect(nml).toContain('<COLLECTION ENTRIES="1">')
    expect(nml).toContain('<PLAYLIST ENTRIES="2"')
  })

  it('escapes XML entities in names', () => {
    const dangerousTracks: Track[] = [
      {
        internalId: '2',
        name: 'Track & "Special" <one>',
        artist: "Artist's Name",
        location: 'C:/Music/track.mp3'
      }
    ]
    const nml = buildNml('Playlist & More', dangerousTracks)
    expect(nml).toContain('Track &amp; &quot;Special&quot; &lt;one&gt;')
    expect(nml).toContain('Playlist &amp; More')
  })

  it('handles tracks with no location', () => {
    const noLocTracks: Track[] = [
      {
        internalId: '3',
        name: 'No Location Track',
        artist: 'Artist',
        location: undefined
      }
    ]
    expect(() => buildNml('Test', noLocTracks)).not.toThrow()
  })
})

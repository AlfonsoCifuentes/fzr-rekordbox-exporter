import { describe, it, expect } from 'vitest'
import { buildRekordboxXml, pathToRekordboxUri } from '../../core/rekordbox/rekordboxXmlBuilder'
import { parseRekordboxXml } from '../../core/rekordbox/parseRekordboxXml'
import type { Playlist } from '../../core/common/types'

const playlists: Playlist[] = [
  {
    id: 'p1',
    name: 'Exported From Traktor',
    path: ['Exported From Traktor'],
    tracks: [
      {
        internalId: 'a',
        name: 'Acid Track 303',
        artist: 'DJ Roland',
        album: 'Silver Box',
        genre: 'Acid Techno',
        bpm: 138,
        key: '9A',
        durationSeconds: 410,
        location: 'D:/DJ Library/Acid Track 303.wav',
        cuePoints: [
          { name: 'Drop', type: 0, startMs: 30500, hotCueIndex: 0 },
          { name: 'Outro Loop', type: 4, startMs: 320000, endMs: 328000, hotCueIndex: 2 }
        ]
      }
    ]
  }
]

describe('rekordboxXmlBuilder', () => {
  it('encodes local Windows paths to Rekordbox file://localhost/ URIs', () => {
    expect(pathToRekordboxUri('D:\\DJ Library\\Acid Track 303.wav')).toBe(
      'file://localhost/D:/DJ%20Library/Acid%20Track%20303.wav'
    )
  })

  it('round-trips buildRekordboxXml -> parseRekordboxXml preserving metadata and cue points', () => {
    const xml = buildRekordboxXml(playlists)
    const parsed = parseRekordboxXml(xml)

    expect(parsed.tracks).toHaveLength(1)
    expect(parsed.playlists).toHaveLength(1)
    expect(parsed.playlists[0].name).toBe('Exported From Traktor')

    const t = parsed.playlists[0].tracks[0]
    expect(t.name).toBe('Acid Track 303')
    expect(t.artist).toBe('DJ Roland')
    expect(t.bpm).toBe(138)
    expect(t.key).toBe('9A')
    expect(t.location).toBe('D:/DJ Library/Acid Track 303.wav')
    expect(t.cuePoints).toHaveLength(2)
    expect(t.cuePoints![0]).toMatchObject({ name: 'Drop', type: 0, startMs: 30500, hotCueIndex: 0 })
    expect(t.cuePoints![1]).toMatchObject({
      name: 'Outro Loop',
      type: 4,
      startMs: 320000,
      endMs: 328000,
      hotCueIndex: 2
    })
  })
})

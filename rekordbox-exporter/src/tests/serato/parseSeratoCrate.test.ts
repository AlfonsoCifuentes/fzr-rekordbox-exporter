import { describe, it, expect } from 'vitest'
import { parseSeratoCrate } from '../../core/serato/parseSeratoCrate'
import { detectFormat } from '../../core/rekordbox/parseRekordboxFile'

function encodeUtf16Be(str: string): Buffer {
  const le = Buffer.from(str, 'utf16le')
  const be = Buffer.alloc(le.length)
  for (let i = 0; i + 1 < le.length; i += 2) {
    be[i] = le[i + 1]
    be[i + 1] = le[i]
  }
  return be
}

function tlv(tag: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8)
  header.write(tag, 0, 4, 'ascii')
  header.writeUInt32BE(payload.length, 4)
  return Buffer.concat([header, payload])
}

describe('parseSeratoCrate', () => {
  it('detects .crate extension in detectFormat', () => {
    expect(detectFormat('Techno%%Peak Time.crate')).toBe('crate')
  })

  it('parses binary Serato TLV .crate files and subcrate hierarchy', () => {
    const vrsn = tlv('vrsn', encodeUtf16Be('1.0/Serato ScratchLive Crate'))
    const track1 = tlv('otrk', tlv('ptrk', encodeUtf16Be('Music/Techno/Amelie Lens - Feel It.wav')))
    const track2 = tlv('otrk', tlv('ptrk', encodeUtf16Be('Music/Techno/Dax J - Propaganda.mp3')))
    const buf = Buffer.concat([vrsn, track1, track2])

    const res = parseSeratoCrate(buf, 'Techno%%Peak Time.crate')
    expect(res.tracks).toHaveLength(2)
    expect(res.playlists).toHaveLength(1)
    expect(res.playlists[0].name).toBe('Peak Time')
    expect(res.playlists[0].path).toEqual(['Techno', 'Peak Time'])

    expect(res.tracks[0]).toMatchObject({
      artist: 'Amelie Lens',
      name: 'Feel It',
      location: '/Music/Techno/Amelie Lens - Feel It.wav'
    })
    expect(res.tracks[1]).toMatchObject({
      artist: 'Dax J',
      name: 'Propaganda'
    })
  })

  it('throws on non-Serato binary buffer', () => {
    expect(() => parseSeratoCrate(Buffer.from('NOT_A_CRATE_FILE'), 'bad.crate')).toThrow(/Serato/)
  })
})

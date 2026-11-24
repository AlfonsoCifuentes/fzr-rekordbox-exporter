import { describe, it, expect } from 'vitest'
import {
  decodeFileUri,
  decodeTextBuffer,
  sanitizeFilename,
  stripBom
} from '../../core/common/filePaths'

describe('filePaths utilities', () => {
  it('decodes Rekordbox file://localhost/ Windows URIs', () => {
    expect(decodeFileUri('file://localhost/C:/Users/DJ/Music/My%20Track.mp3')).toBe(
      'C:/Users/DJ/Music/My Track.mp3'
    )
  })

  it('decodes file:/// Windows URIs', () => {
    expect(decodeFileUri('file:///D:/Sets/Track%2001.flac')).toBe('D:/Sets/Track 01.flac')
  })

  it('decodes macOS file://localhost/Volumes/... URIs', () => {
    expect(decodeFileUri('file://localhost/Volumes/USB%20DJ/Techno/Track.aiff')).toBe(
      '/Volumes/USB DJ/Techno/Track.aiff'
    )
  })

  it('handles stray % signs in URIs without throwing', () => {
    expect(decodeFileUri('file://localhost/C:/Music/100% Pure%20Techno.mp3')).toBe(
      'C:/Music/100% Pure Techno.mp3'
    )
  })

  it('decodes UTF-16 LE BOM buffers (Rekordbox TXT default)', () => {
    const text = '#\tTrack Title\tArtist\n1\tAcid Rain\tDJ Test'
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')])
    expect(decodeTextBuffer(buf)).toBe(text)
  })

  it('decodes UTF-8 BOM buffers cleanly', () => {
    const text = '#EXTM3U\n#EXTINF:300,Artist - Track'
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf-8')])
    expect(decodeTextBuffer(buf)).toBe(text)
  })

  it('strips BOM from strings', () => {
    expect(stripBom('\uFEFFhello')).toBe('hello')
  })

  it('sanitizes Windows reserved names and invalid filename characters', () => {
    expect(sanitizeFilename('Techno: 140/145* <Live>')).toBe('Techno_ 140_145_ _Live_')
    expect(sanitizeFilename('CON')).toBe('CON_')
    expect(sanitizeFilename('   ...  ')).toBe('playlist')
  })
})

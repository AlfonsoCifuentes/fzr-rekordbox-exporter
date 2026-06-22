import { describe, it, expect } from 'vitest'
import { detectFormat, parseRekordboxFile } from '../../core/rekordbox/parseRekordboxFile'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('detectFormat', () => {
  it('detects xml', () => expect(detectFormat('collection.xml')).toBe('xml'))
  it('detects m3u8', () => expect(detectFormat('playlist.m3u8')).toBe('m3u8'))
  it('detects m3u', () => expect(detectFormat('playlist.m3u')).toBe('m3u'))
  it('detects txt', () => expect(detectFormat('export.txt')).toBe('txt'))
  it('is case-insensitive', () => expect(detectFormat('FILE.XML')).toBe('xml'))
  it('throws on unsupported extension', () => {
    expect(() => detectFormat('file.pdf')).toThrow(/soportado/)
  })
})

describe('parseRekordboxFile', () => {
  it('dispatches xml to XML parser', () => {
    const xml = readFileSync(
      join(__dirname, '../fixtures/rekordbox/sample_collection.xml'),
      'utf-8'
    )
    const result = parseRekordboxFile(xml, 'sample_collection.xml')
    expect(result.tracks.length).toBeGreaterThan(0)
    expect(result.playlists.length).toBeGreaterThan(0)
  })

  it('dispatches m3u8 to M3U8 parser', () => {
    const content = readFileSync(
      join(__dirname, '../fixtures/rekordbox/sample_playlist.m3u8'),
      'utf-8'
    )
    const result = parseRekordboxFile(content, 'sample_playlist.m3u8')
    expect(result.playlists).toHaveLength(1)
    expect(result.playlists[0].name).toBe('sample_playlist')
  })

  it('dispatches txt to TXT parser', () => {
    const content = readFileSync(
      join(__dirname, '../fixtures/rekordbox/sample_playlist.txt'),
      'utf-8'
    )
    const result = parseRekordboxFile(content, 'sample_playlist.txt')
    expect(result.playlists).toHaveLength(1)
  })
})

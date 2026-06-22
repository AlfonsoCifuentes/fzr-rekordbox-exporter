import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseRekordboxXml } from '../../core/rekordbox/parseRekordboxXml'

const FIXTURE_PATH = join(__dirname, '../fixtures/rekordbox/sample_collection.xml')

describe('parseRekordboxXml', () => {
  it('parses tracks from COLLECTION', () => {
    const xml = readFileSync(FIXTURE_PATH, 'utf-8')
    const result = parseRekordboxXml(xml)

    expect(result.tracks).toHaveLength(4)
    const trackOne = result.tracks.find((t) => t.rekordboxTrackId === '1')
    expect(trackOne).toBeDefined()
    expect(trackOne!.name).toBe('Test Track One')
    expect(trackOne!.artist).toBe('Artist A')
    expect(trackOne!.bpm).toBe(130)
    expect(trackOne!.durationSeconds).toBe(360)
    expect(trackOne!.key).toBe('1A')
  })

  it('converts Location URI to local path', () => {
    const xml = readFileSync(FIXTURE_PATH, 'utf-8')
    const result = parseRekordboxXml(xml)
    const trackOne = result.tracks.find((t) => t.rekordboxTrackId === '1')
    expect(trackOne!.location).toBe('C:/Music/Artist A/Test Track One.mp3')
  })

  it('parses nested playlists preserving folder path', () => {
    const xml = readFileSync(FIXTURE_PATH, 'utf-8')
    const result = parseRekordboxXml(xml)

    const technoPlaylist = result.playlists.find((p) => p.name === 'My Techno Playlist')
    expect(technoPlaylist).toBeDefined()
    expect(technoPlaylist!.path).toEqual(['ROOT', 'Techno Folder', 'My Techno Playlist'])
    expect(technoPlaylist!.tracks).toHaveLength(2)
  })

  it('preserves track order within playlists', () => {
    const xml = readFileSync(FIXTURE_PATH, 'utf-8')
    const result = parseRekordboxXml(xml)
    const technoPlaylist = result.playlists.find((p) => p.name === 'My Techno Playlist')!
    expect(technoPlaylist.tracks[0].rekordboxTrackId).toBe('1')
    expect(technoPlaylist.tracks[1].rekordboxTrackId).toBe('3')
  })

  it('warns about missing track references', () => {
    const xml = readFileSync(FIXTURE_PATH, 'utf-8')
    const result = parseRekordboxXml(xml)
    expect(result.warnings.some((w) => w.includes('99'))).toBe(true)
  })

  it('warns about tracks without location', () => {
    const xml = readFileSync(FIXTURE_PATH, 'utf-8')
    const result = parseRekordboxXml(xml)
    expect(result.warnings.some((w) => w.includes('Track Without Location') || w.includes('sin ruta'))).toBe(true)
  })

  it('throws on invalid XML', () => {
    expect(() => parseRekordboxXml('not xml <<')).toThrow()
  })

  it('throws when DJ_PLAYLISTS is missing', () => {
    expect(() => parseRekordboxXml('<root><other/></root>')).toThrow(/Rekordbox/)
  })
})

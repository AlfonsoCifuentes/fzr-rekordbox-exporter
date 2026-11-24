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

  it('strips file://localhost/ prefix, parses POSITION_MARK cue points, preserves numeric titles, and supports KeyType=1', () => {
    const xml = `\uFEFF<?xml version="1.0" encoding="utf-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <COLLECTION Entries="1">
    <TRACK TrackID="007" Name="1999" Artist="Prince" TotalTime="375" AverageBpm="118.5" BitRate="320"
      Location="file://localhost/C:/Music/100%25%20Classics/1999.mp3" Tonality="8A">
      <POSITION_MARK Name="Intro" Type="0" Start="12.500" Num="0" Red="40" Green="226" Blue="20"/>
      <POSITION_MARK Name="Loop A" Type="4" Start="60.000" End="68.000" Num="1"/>
    </TRACK>
  </COLLECTION>
  <PLAYLISTS>
    <NODE Name="ROOT" Type="0" Count="1">
      <NODE Name="LocationKeyPlaylist" Type="1" KeyType="1" Entries="1">
        <TRACK Key="file://localhost/C:/Music/100%25%20Classics/1999.mp3"/>
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`

    const result = parseRekordboxXml(xml)
    expect(result.tracks).toHaveLength(1)
    const t = result.tracks[0]
    expect(t.rekordboxTrackId).toBe('007')
    expect(t.name).toBe('1999')
    expect(t.location).toBe('C:/Music/100% Classics/1999.mp3')
    expect(t.bitrate).toBe(320)
    expect(t.cuePoints).toHaveLength(2)
    expect(t.cuePoints![0]).toMatchObject({ name: 'Intro', type: 0, startMs: 12500, hotCueIndex: 0 })
    expect(t.cuePoints![1]).toMatchObject({ name: 'Loop A', type: 4, startMs: 60000, endMs: 68000, hotCueIndex: 1 })
    expect(result.playlists).toHaveLength(1)
    expect(result.playlists[0].tracks).toHaveLength(1)
    expect(result.playlists[0].tracks[0].name).toBe('1999')
  })
})

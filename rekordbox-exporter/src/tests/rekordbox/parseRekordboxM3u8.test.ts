import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseRekordboxM3u8 } from '../../core/rekordbox/parseRekordboxM3u8'

const FIXTURE = join(__dirname, '../fixtures/rekordbox/sample_playlist.m3u8')

describe('parseRekordboxM3u8', () => {
  it('returns a single playlist named after the file', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'my techno set.m3u8')
    expect(result.playlists).toHaveLength(1)
    expect(result.playlists[0].name).toBe('my techno set')
  })

  it('parses all tracks', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'sample_playlist.m3u8')
    expect(result.tracks).toHaveLength(4)
  })

  it('splits artist and title from EXTINF display name', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'sample_playlist.m3u8')
    const first = result.tracks[0]
    expect(first.artist).toBe('Artist A')
    expect(first.name).toBe('Track One')
  })

  it('parses duration from EXTINF', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'sample_playlist.m3u8')
    expect(result.tracks[0].durationSeconds).toBe(360)
  })

  it('handles -1 duration (unknown) as undefined', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'sample_playlist.m3u8')
    const last = result.tracks[result.tracks.length - 1]
    expect(last.durationSeconds).toBeUndefined()
  })

  it('extracts file path as location', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'sample_playlist.m3u8')
    expect(result.tracks[0].location).toBe('C:\\Music\\Artist A\\Track One.mp3')
  })

  it('decodes file:// URI location', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'sample_playlist.m3u8')
    const last = result.tracks[result.tracks.length - 1]
    expect(last.location).toBe('C:/Music/Artist D/Track Without Duration.mp3')
  })

  it('preserves track order', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'sample_playlist.m3u8')
    expect(result.tracks[0].name).toBe('Track One')
    expect(result.tracks[1].name).toBe('Track Two (Extended Mix)')
  })

  it('tracks and playlist.tracks are the same references', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'sample_playlist.m3u8')
    expect(result.playlists[0].tracks).toEqual(result.tracks)
  })

  it('handles display name without separator as title only', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxM3u8(content, 'sample_playlist.m3u8')
    const third = result.tracks[2]
    expect(third.name).toBe('Unknown Artist Track')
    expect(third.artist).toBe('(artista desconocido)')
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseRekordboxTxt } from '../../core/rekordbox/parseRekordboxTxt'

const FIXTURE = join(__dirname, '../fixtures/rekordbox/sample_playlist.txt')

describe('parseRekordboxTxt', () => {
  it('returns a single playlist named after the file', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    expect(result.playlists).toHaveLength(1)
    expect(result.playlists[0].name).toBe('sample_playlist')
  })

  it('parses tracks skipping header row', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    expect(result.tracks).toHaveLength(3)
  })

  it('parses track title and artist', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    expect(result.tracks[0].name).toBe('Test Track One')
    expect(result.tracks[0].artist).toBe('Artist A')
  })

  it('parses BPM as a number', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    expect(result.tracks[0].bpm).toBe(130)
  })

  it('parses Total Time in M:SS format to seconds', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    expect(result.tracks[0].durationSeconds).toBe(360)
  })

  it('parses key (Tonality)', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    expect(result.tracks[0].key).toBe('1A')
  })

  it('parses file location', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    expect(result.tracks[0].location).toContain('Test Track One.mp3')
  })

  it('parses Mix Name', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    expect(result.tracks[0].mix).toBe('Original Mix')
  })

  it('handles track without location gracefully', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    const last = result.tracks[result.tracks.length - 1]
    expect(last.location).toBeUndefined()
    expect(last.name).toBe('Track Without Location')
  })

  it('preserves track order', () => {
    const content = readFileSync(FIXTURE, 'utf-8')
    const result = parseRekordboxTxt(content, 'sample_playlist.txt')
    expect(result.tracks[0].name).toBe('Test Track One')
    expect(result.tracks[1].name).toBe('Test Track Two')
  })

  it('throws on empty file', () => {
    expect(() => parseRekordboxTxt('', 'empty.txt')).toThrow()
  })

  it('throws when separator cannot be detected', () => {
    expect(() => parseRekordboxTxt('just one column\nsecond row', 'bad.txt')).toThrow(/formato/)
  })
})

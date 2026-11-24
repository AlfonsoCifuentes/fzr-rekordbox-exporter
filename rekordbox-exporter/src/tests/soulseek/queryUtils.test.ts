import { describe, it, expect } from 'vitest'
import {
  cleanSoulseekQuery,
  buildQueryVariations,
  classifyAudioQuality,
  matchesQualityFilter,
  rankSoulseekCandidates,
  buildAutopilotReport
} from '../../core/soulseek/queryUtils'
import type { AutopilotTrackItem, SoulseekCandidateInput } from '../../core/soulseek/types'

describe('Soulseek Autopilot queryUtils', () => {
  it('cleans brackets, featuring tags, download noise and accents', () => {
    expect(cleanSoulseekQuery('Daft Punk feat. Pharrell', 'Get Lucky [FREE DOWNLOAD] (320kbps)')).toBe(
      'Daft Punk Get Lucky'
    )
    expect(cleanSoulseekQuery('Björk', 'Jóga (Official Audio)')).toBe('Bjork Joga')
  })

  it('generates primary and simplified fallback query variations', () => {
    const vars = buildQueryVariations('Amelie Lens, Farrago', 'Feel It (Dax J Remix)')
    expect(vars.length).toBeGreaterThanOrEqual(2)
    expect(vars[0]).toBe('Amelie Lens Farrago Feel It')
    expect(vars.some((v) => v.includes('Remix'))).toBe(true)
  })

  it('classifies Hi-Res, FLAC/WAV, 320kbps MP3, and lower bitrates accurately', () => {
    expect(classifyAudioQuality('Music/track.flac', 2100, 96000, 24).tier).toBe('hires')
    expect(classifyAudioQuality('Music/track.flac', 1000, 44100, 16).tier).toBe('flac')
    expect(classifyAudioQuality('Music/track.wav').tier).toBe('flac')
    expect(classifyAudioQuality('Music/track.mp3', 320).tier).toBe('mp3_320')
    expect(classifyAudioQuality('Music/track.mp3', 192).tier).toBe('mp3_192')
  })

  it('enforces all 4 quality filter modes strictly', () => {
    expect(matchesQualityFilter('mp3_192', 'all')).toBe(true)
    expect(matchesQualityFilter('mp3_192', '320+')).toBe(false)
    expect(matchesQualityFilter('mp3_320', '320+')).toBe(true)
    expect(matchesQualityFilter('mp3_320', 'flac')).toBe(false)
    expect(matchesQualityFilter('flac', 'flac')).toBe(true)
    expect(matchesQualityFilter('flac', 'hires')).toBe(false)
    expect(matchesQualityFilter('hires', 'hires')).toBe(true)
  })

  it('ranks candidates prioritizing quality, filename match, free slots and peer speed', () => {
    const candidates: SoulseekCandidateInput[] = [
      {
        user: 'slow_peer',
        file: '@@music\\Daft Punk - One More Time.mp3',
        size: 11_000_000,
        slots: false,
        speed: 50_000,
        bitrate: 192
      },
      {
        user: 'flac_peer',
        file: '@@lossless\\Daft Punk - One More Time.flac',
        size: 38_000_000,
        slots: true,
        speed: 1_500_000,
        sampleRate: 44100,
        bitDepth: 16
      },
      {
        user: 'unrelated_peer',
        file: '@@lossless\\Completely Different Song.flac',
        size: 35_000_000,
        slots: true,
        speed: 2_000_000
      }
    ]

    const ranked = rankSoulseekCandidates(candidates, 'Daft Punk', 'One More Time', '320+')
    expect(ranked).toHaveLength(1)
    expect(ranked[0].user).toBe('flac_peer')
    expect(ranked[0].qualityTier).toBe('flac')
  })

  it('builds a full JSON report with quality distribution and per-artist success rates', () => {
    const tracks: AutopilotTrackItem[] = [
      {
        trackId: '1',
        artist: 'Daft Punk',
        name: 'One More Time',
        cleanedQuery: 'Daft Punk One More Time',
        status: 'completed',
        attempts: 1,
        qualityTier: 'flac',
        qualityLabel: 'FLAC Lossless',
        peer: 'dj_vault',
        savedPath: 'C:/Music/Daft Punk - One More Time.flac'
      },
      {
        trackId: '2',
        artist: 'Daft Punk',
        name: 'Aerodynamic',
        cleanedQuery: 'Daft Punk Aerodynamic',
        status: 'failed',
        attempts: 3,
        error: 'No results'
      },
      {
        trackId: '3',
        artist: 'Justice',
        name: 'Genesis',
        cleanedQuery: 'Justice Genesis',
        status: 'skipped-duplicate',
        attempts: 0
      }
    ]

    const report = buildAutopilotReport({
      sessionId: 'sess-1',
      playlistName: 'French Touch',
      downloadDir: 'C:/Music',
      dryRun: false,
      qualityFilter: '320+',
      tracks,
      durationMs: 12000
    })

    expect(report.total).toBe(3)
    expect(report.exitosasCount).toBe(1)
    expect(report.fallidasCount).toBe(1)
    expect(report.omitidasCount).toBe(1)
    expect(report.successRate).toBe(50)
    expect(report.qualityDistribution['FLAC Lossless']).toBe(1)
    const daft = report.artistStats.find((a) => a.artist === 'Daft Punk')
    expect(daft?.successRate).toBe(50)
  })
})

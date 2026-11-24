import type {
  AutopilotArtistStat,
  AutopilotReport,
  AutopilotTrackItem,
  QualityFilter,
  QualityTier,
  RankedSoulseekCandidate,
  SoulseekCandidateInput
} from './types'

const AUDIO_EXT_RE = /\.(flac|wav|aiff|aif|alac|mp3|m4a|ogg|opus|aac)$/i

const LOSSLESS_EXT_RE = /\.(flac|wav|aiff|aif|alac)$/i

const STRIP_BRACKETS_RE = /[\[\(\{][^\]\)\}]*[\]\)\}]/g
const FEAT_RE = /\b(feat\.?|ft\.?|featuring|with)\b.*$/i
const JUNK_WORDS_RE = /\b(free download|download|320\s*kbps|flac|wav|hq|hd|official audio|official video|lyric video|audio)\b/gi

/**
 * Clean artist + track name for maximum Soulseek search hit rate.
 * Removes brackets, featuring credits, download noise, and special punctuation.
 */
export function cleanSoulseekQuery(artist: string, title: string): string {
  const cleanPart = (raw: string): string =>
    raw
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(STRIP_BRACKETS_RE, ' ')
      .replace(FEAT_RE, ' ')
      .replace(JUNK_WORDS_RE, ' ')
      .replace(/['"`´’]/g, '')
      .replace(/[^a-zA-Z0-9\s\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const a = cleanPart(artist)
  const t = cleanPart(title)
  return `${a} ${t}`.replace(/\s+/g, ' ').trim()
}

/**
 * Produce ordered query variations: full cleaned query first, then simplified fallbacks.
 */
export function buildQueryVariations(artist: string, title: string): string[] {
  const variations: string[] = []
  const primary = cleanSoulseekQuery(artist, title)
  if (primary) variations.push(primary)

  // Secondary: first artist only (split by , / & / x) + cleaned title
  const firstArtist = artist.split(/[,&;/]|(?:\s+x\s+)/i)[0]?.trim() ?? ''
  const secondary = cleanSoulseekQuery(firstArtist, title)
  if (secondary && !variations.includes(secondary)) {
    variations.push(secondary)
  }

  // Tertiary: raw stripped without removing parenthetical remix name if remix keyword present
  if (/\b(remix|edit|mix|dub|vip|rework)\b/i.test(title)) {
    const withRemix = `${firstArtist || artist} ${title}`
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (withRemix && !variations.includes(withRemix)) {
      variations.push(withRemix)
    }
  }

  return variations
}

/**
 * Classify a Soulseek result's audio quality tier & human label.
 */
export function classifyAudioQuality(
  filePath: string,
  bitrate?: number,
  sampleRate?: number,
  bitDepth?: number
): { tier: QualityTier; label: string } {
  const lower = filePath.toLowerCase()
  const isLossless = LOSSLESS_EXT_RE.test(lower)

  if (isLossless) {
    const isHiRes =
      (bitDepth !== undefined && bitDepth >= 24) ||
      (sampleRate !== undefined && sampleRate >= 88200) ||
      /\b(24\s*bit|24-?96|24-?192|hi-?res)\b/i.test(lower)
    if (isHiRes) {
      const srKhz = sampleRate ? `${Math.round(sampleRate / 1000)}kHz` : 'Hi-Res'
      return {
        tier: 'hires',
        label: bitDepth ? `Hi-Res ${bitDepth}b/${srKhz}` : `Hi-Res FLAC`
      }
    }
    const ext = lower.endsWith('.wav')
      ? 'WAV'
      : lower.endsWith('.aiff') || lower.endsWith('.aif')
        ? 'AIFF'
        : 'FLAC'
    return { tier: 'flac', label: `${ext} Lossless` }
  }

  if (bitrate !== undefined && bitrate >= 315) {
    return { tier: 'mp3_320', label: `${bitrate}kbps MP3` }
  }
  if (/\b320\s*k?(bps)?\b/i.test(lower) && /\.mp3$/i.test(lower)) {
    return { tier: 'mp3_320', label: '320kbps MP3' }
  }
  if (bitrate !== undefined && bitrate >= 245) {
    return { tier: 'mp3_256', label: `${bitrate}kbps` }
  }
  if (bitrate !== undefined && bitrate >= 185) {
    return { tier: 'mp3_192', label: `${bitrate}kbps` }
  }

  return {
    tier: 'other',
    label: bitrate ? `${bitrate}kbps` : 'Audio'
  }
}

/**
 * Check if a classified quality tier satisfies the user's selected quality filter.
 */
export function matchesQualityFilter(tier: QualityTier, filter: QualityFilter): boolean {
  switch (filter) {
    case 'hires':
      return tier === 'hires'
    case 'flac':
      return tier === 'flac' || tier === 'hires'
    case '320+':
      return tier === 'mp3_320' || tier === 'flac' || tier === 'hires'
    case 'all':
    default:
      return true
  }
}

const QUALITY_BASE_WEIGHTS: Record<QualityFilter, Record<QualityTier, number>> = {
  // Default DJ booth preference: 320kbps MP3 & FLAC top, Hi-Res close behind
  all: { mp3_320: 95, flac: 92, hires: 88, mp3_256: 65, mp3_192: 45, other: 20 },
  '320+': { flac: 96, mp3_320: 95, hires: 92, mp3_256: 0, mp3_192: 0, other: 0 },
  flac: { flac: 100, hires: 96, mp3_320: 0, mp3_256: 0, mp3_192: 0, other: 0 },
  hires: { hires: 100, flac: 0, mp3_320: 0, mp3_256: 0, mp3_192: 0, other: 0 }
}

function tokenize(str: string): string[] {
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2)
}

/**
 * Score how well a peer's file path matches the requested artist & track title (0–100).
 */
export function scoreFilenameMatch(filePath: string, artist: string, title: string): number {
  const pathTokens = new Set(tokenize(filePath))
  const artistTokens = tokenize(artist)
  const titleTokens = tokenize(title)

  if (titleTokens.length === 0) return 0

  const titleHits = titleTokens.filter((t) => pathTokens.has(t)).length
  const titleRatio = titleHits / titleTokens.length

  const artistHits =
    artistTokens.length > 0 ? artistTokens.filter((t) => pathTokens.has(t)).length : 0
  const artistRatio = artistTokens.length > 0 ? artistHits / artistTokens.length : 1

  // Must match at least half of title tokens to be considered relevant
  if (titleRatio < 0.5) return Math.round(titleRatio * 40)

  let score = titleRatio * 65 + artistRatio * 35

  // Slight penalty if user wants original but result is instrumental/acapella/karaoke
  const wantRemix = /\b(remix|acapella|instrumental|karaoke|live)\b/i.test(title)
  if (!wantRemix && /\b(acapella|instrumental|karaoke|midi|ringtone)\b/i.test(filePath)) {
    score -= 45
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Filter & rank Soulseek search results by quality filter, filename match, free slots, and speed.
 */
export function rankSoulseekCandidates(
  candidates: SoulseekCandidateInput[],
  artist: string,
  title: string,
  filter: QualityFilter
): RankedSoulseekCandidate[] {
  const ranked: RankedSoulseekCandidate[] = []

  for (const c of candidates) {
    if (!AUDIO_EXT_RE.test(c.file)) continue
    // Skip obviously tiny/corrupt audio files (< 500 KB)
    if (c.size > 0 && c.size < 500_000) continue

    const { tier, label } = classifyAudioQuality(c.file, c.bitrate, c.sampleRate, c.bitDepth)
    if (!matchesQualityFilter(tier, filter)) continue

    const matchScore = scoreFilenameMatch(c.file, artist, title)
    if (matchScore < 45) continue

    const qualityWeight = QUALITY_BASE_WEIGHTS[filter][tier]
    const slotBonus = c.slots ? 25 : 0
    const speedBonus = Math.min(20, Math.round((c.speed || 0) / 100_000))
    const queuePenalty = c.queueLength && c.queueLength > 20 ? -10 : 0

    const totalScore = qualityWeight + matchScore + slotBonus + speedBonus + queuePenalty

    ranked.push({
      ...c,
      qualityTier: tier,
      qualityLabel: label,
      matchScore,
      totalScore
    })
  }

  return ranked.sort((a, b) => b.totalScore - a.totalScore)
}

/**
 * Normalized duplicate signature for Artist + Song detection.
 */
export function autopilotTrackSignature(artist: string, name: string): string {
  return cleanSoulseekQuery(artist, name).toLowerCase()
}

/**
 * Compute quality distribution and per-artist success stats from current track results.
 */
export function computeAutopilotStats(tracks: AutopilotTrackItem[]): {
  qualityBreakdown: Record<string, number>
  artistStats: AutopilotArtistStat[]
} {
  const qualityBreakdown: Record<string, number> = {}
  const artistMap = new Map<string, { total: number; succeeded: number; failed: number }>()

  for (const t of tracks) {
    if ((t.status === 'completed' || t.status === 'dry-run') && t.qualityLabel) {
      qualityBreakdown[t.qualityLabel] = (qualityBreakdown[t.qualityLabel] ?? 0) + 1
    }

    const artistKey = t.artist.trim() || 'Unknown'
    const entry = artistMap.get(artistKey) ?? { total: 0, succeeded: 0, failed: 0 }
    entry.total += 1
    if (t.status === 'completed' || t.status === 'dry-run') entry.succeeded += 1
    else if (t.status === 'failed') entry.failed += 1
    artistMap.set(artistKey, entry)
  }

  const artistStats: AutopilotArtistStat[] = Array.from(artistMap.entries())
    .map(([artist, s]) => ({
      artist,
      total: s.total,
      succeeded: s.succeeded,
      failed: s.failed,
      successRate: s.total > 0 ? Math.round((s.succeeded / s.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)

  return { qualityBreakdown, artistStats }
}

/**
 * Build the structured JSON report matching FZR Soulseek Autopilot v3/v4 schema.
 */
export function buildAutopilotReport(params: {
  sessionId: string
  playlistName: string
  downloadDir: string
  dryRun: boolean
  qualityFilter: QualityFilter
  tracks: AutopilotTrackItem[]
  durationMs: number
}): AutopilotReport {
  const { qualityBreakdown, artistStats } = computeAutopilotStats(params.tracks)

  const exitosas = params.tracks
    .filter((t) => t.status === 'completed' || t.status === 'dry-run')
    .map((t) => ({
      artist: t.artist,
      song: t.name,
      quality: t.qualityLabel ?? 'Audio',
      peer: t.peer,
      savedPath: t.savedPath,
      attempts: t.attempts
    }))

  const fallidas = params.tracks
    .filter((t) => t.status === 'failed')
    .map((t) => ({
      artist: t.artist,
      song: t.name,
      reason: t.error ?? 'No results matching quality filter',
      attempts: t.attempts
    }))

  const omitidas = params.tracks
    .filter((t) => t.status === 'skipped-duplicate' || t.status === 'skipped-existing')
    .map((t) => ({
      artist: t.artist,
      song: t.name,
      reason: t.status === 'skipped-duplicate' ? 'Duplicate in playlist' : 'Already exists in download folder'
    }))

  const attempted = exitosas.length + fallidas.length
  const successRate = attempted > 0 ? Math.round((exitosas.length / attempted) * 100) : 0

  return {
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    playlistName: params.playlistName,
    downloadDir: params.downloadDir,
    dryRun: params.dryRun,
    qualityFilter: params.qualityFilter,
    total: params.tracks.length,
    exitosasCount: params.tracks.filter((t) => t.status === 'completed').length,
    dryRunCount: params.tracks.filter((t) => t.status === 'dry-run').length,
    fallidasCount: fallidas.length,
    omitidasCount: omitidas.length,
    successRate,
    durationMs: params.durationMs,
    qualityDistribution: qualityBreakdown,
    artistStats,
    exitosas,
    fallidas,
    omitidas
  }
}

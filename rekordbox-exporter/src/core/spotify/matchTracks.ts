import type { Track, SpotifyCandidate, SpotifyMatch } from '../common/types'
import {
  normalizeText,
  normalizePrimaryArtist,
  extractArtists,
  splitTitleAndMix,
  fuzzySimilarity
} from '../common/normalizeText'

export type RawSpotifyTrack = {
  id: string
  uri: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    release_date?: string
    images?: Array<{ url: string }>
  }
  duration_ms: number
  external_urls?: { spotify?: string }
}

export const AUTO_MATCH_THRESHOLD = 82
export const AMBIGUOUS_THRESHOLD = 62

/**
 * Generate a stable fingerprint for caching a track's Spotify match locally.
 */
export function buildTrackFingerprint(track: Track): string {
  const title = normalizeText(track.name)
  const artist = normalizeText(track.artist)
  const dur = track.durationSeconds ? Math.round(track.durationSeconds) : ''
  const remixer = track.remixer ? normalizeText(track.remixer) : ''
  return `${artist}||${title}||${remixer}||${dur}`
}

/**
 * Clean a query fragment so Spotify search operators don't choke on quotes/brackets.
 */
function sanitizeQueryPart(str: string): string {
  return normalizeText(str)
    .replace(/['"()[\]{}:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build an ordered waterfall of Spotify search queries for a DJ track,
 * from most specific to broadest fallback.
 */
export function buildSearchQueries(track: Track): string[] {
  const queries: string[] = []
  const seen = new Set<string>()
  const push = (q: string): void => {
    const trimmed = q.trim()
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase())
      queries.push(trimmed)
    }
  }

  const rawTitle = track.name === '(sin título)' ? '' : track.name
  const rawArtist = track.artist === '(artista desconocido)' ? '' : track.artist

  const cleanTitle = sanitizeQueryPart(rawTitle)
  const { base: baseTitle, mix } = splitTitleAndMix(rawTitle)
  const cleanBase = sanitizeQueryPart(baseTitle)
  const primaryArtist = sanitizeQueryPart(normalizePrimaryArtist(rawArtist))
  const remixer = track.remixer ? sanitizeQueryPart(track.remixer) : ''

  if (!cleanTitle && !primaryArtist) return []

  // 1. Structured field search with full normalized title + primary artist
  if (cleanTitle && primaryArtist) {
    push(`track:${cleanTitle} artist:${primaryArtist}`)
  }

  // 2. If track has a mix tag (e.g. "Extended Mix" / "Original Mix"), search base title + primary artist
  if (cleanBase && cleanBase !== cleanTitle && primaryArtist) {
    push(`track:${cleanBase} artist:${primaryArtist}`)
  }

  // 3. Free-text query (Spotify ranks remix/featured artists much better in free-text)
  if (cleanTitle && primaryArtist) {
    push(`${cleanTitle} ${primaryArtist}`)
  }

  // 4. Base title + remixer (essential for underground/club remixes!)
  if (cleanBase && remixer) {
    push(`${cleanBase} ${remixer}`)
  }

  // 5. Base title + primary artist free-text (catches Radio Edit vs Extended Mix)
  if (cleanBase && cleanBase !== cleanTitle && primaryArtist) {
    push(`${cleanBase} ${primaryArtist}`)
  }

  // 6. Title-only fallback if artist is missing
  if (cleanBase && !primaryArtist) {
    push(cleanBase)
  }

  return queries
}

/**
 * Score a raw Spotify candidate against a source Rekordbox Track (0-100).
 *
 * Breakdown:
 * - Title similarity:  up to 40 pts
 * - Artist similarity: up to 25 pts
 * - Duration match:    up to 20 pts
 * - Mix/Remix match:   up to 10 pts
 * - Album/Year match:  up to 5 pts
 */
export function scoreCandidate(track: Track, item: RawSpotifyTrack): SpotifyCandidate {
  const srcFullTitle = normalizeText(track.name)
  const srcSplit = splitTitleAndMix(track.name)
  const srcMix = normalizeText(track.mix || srcSplit.mix || (track.remixer ? `${track.remixer} remix` : ''))

  const candFullTitle = normalizeText(item.name)
  const candSplit = splitTitleAndMix(item.name)

  // 1. Title score (0..40)
  const fullSim = fuzzySimilarity(srcFullTitle, candFullTitle)
  const baseSim = fuzzySimilarity(srcSplit.base || srcFullTitle, candSplit.base || candFullTitle)
  const titleSim = Math.max(fullSim, baseSim * 0.96)
  const titleScore = Math.round(titleSim * 40)

  // 2. Artist score (0..25)
  const srcArtists = extractArtists(track.artist)
  const candArtists = item.artists.map((a) => normalizeText(a.name)).filter(Boolean)
  let artistSim = 0
  if (srcArtists.length > 0 && candArtists.length > 0) {
    const srcPrimary = srcArtists[0]
    // Best match for primary artist against any Spotify artist
    const primaryBest = Math.max(...candArtists.map((ca) => fuzzySimilarity(srcPrimary, ca)))
    // Also compare full artist strings joined
    const joinedBest = fuzzySimilarity(srcArtists.join(' '), candArtists.join(' '))
    artistSim = Math.max(primaryBest, joinedBest)
  } else if (srcArtists.length === 0) {
    // Unknown source artist — give modest neutral score so strong title+duration can still show as ambiguous
    artistSim = 0.4
  }
  const artistScore = Math.round(artistSim * 25)

  // 3. Duration score (0..20, with penalty if wildly off)
  let durationScore = 10 // neutral when source duration is unknown
  if (track.durationSeconds && track.durationSeconds > 0 && item.duration_ms > 0) {
    const candSeconds = item.duration_ms / 1000
    const diff = Math.abs(track.durationSeconds - candSeconds)
    if (diff <= 3) durationScore = 20
    else if (diff <= 8) durationScore = 16
    else if (diff <= 15) durationScore = 11
    else if (diff <= 25) durationScore = 5
    else if (diff <= 60) durationScore = 1
    else durationScore = -4 // e.g. 2 min radio edit vs 7 min extended or wrong track
  }

  // 4. Mix / Remix score (0..10)
  let mixScore = 6
  const isSrcRemix = /\b(remix|rework|bootleg|vip|dub|flip)\b/i.test(srcMix) || Boolean(track.remixer)
  const isCandRemix = /\b(remix|rework|bootleg|vip|dub|flip)\b/i.test(candSplit.mix)

  if (srcMix && candSplit.mix) {
    const mixSim = fuzzySimilarity(srcMix, candSplit.mix)
    if (mixSim >= 0.75) mixScore = 10
    else if (!isSrcRemix && !isCandRemix) mixScore = 7 // Extended Mix vs Original Mix
    else if (isSrcRemix && isCandRemix) mixScore = Math.round(mixSim * 10)
    else mixScore = 2 // one is remix, other isn't
  } else if (isSrcRemix && !isCandRemix) {
    // Source wants a specific remix, candidate is original — check if remixer is in candidate artists/title
    const remixerNorm = normalizeText(track.remixer ?? '')
    const remixerPresent =
      remixerNorm &&
      (candFullTitle.includes(remixerNorm) || candArtists.some((ca) => ca.includes(remixerNorm)))
    mixScore = remixerPresent ? 9 : 1
  } else if (!isSrcRemix && isCandRemix) {
    mixScore = 2
  } else if (!srcMix && !candSplit.mix) {
    mixScore = 8
  }

  // 5. Album / Year score (0..5)
  let albumScore = 0
  if (track.album && item.album?.name) {
    const albSim = fuzzySimilarity(track.album, item.album.name)
    if (albSim >= 0.8) albumScore += 3
    else if (albSim >= 0.5) albumScore += 1
  }
  const candYear = item.album?.release_date
    ? parseInt(item.album.release_date.slice(0, 4), 10)
    : undefined
  if (track.year && candYear && !isNaN(candYear)) {
    if (Math.abs(track.year - candYear) <= 1) albumScore += 2
  }
  albumScore = Math.min(5, albumScore)

  const totalScore = Math.max(
    0,
    Math.min(100, titleScore + artistScore + durationScore + mixScore + albumScore)
  )

  return {
    spotifyTrackId: item.id,
    spotifyUri: item.uri,
    title: item.name,
    artists: item.artists.map((a) => a.name),
    album: item.album?.name ?? '',
    durationMs: item.duration_ms,
    year: candYear && !isNaN(candYear) ? candYear : undefined,
    externalUrl: item.external_urls?.spotify,
    albumArtUrl: item.album?.images?.[item.album.images.length - 1]?.url,
    score: totalScore,
    breakdown: {
      title: titleScore,
      artist: artistScore,
      duration: Math.max(0, durationScore),
      mix: mixScore,
      album: albumScore
    }
  }
}

/**
 * Rank raw Spotify items and classify the best match for a source track.
 */
export function classifyMatch(
  track: Track,
  rawItems: RawSpotifyTrack[],
  queryUsed?: string
): SpotifyMatch {
  // Deduplicate by spotifyTrackId
  const byId = new Map<string, RawSpotifyTrack>()
  for (const item of rawItems) {
    if (!byId.has(item.id)) byId.set(item.id, item)
  }

  const candidates = Array.from(byId.values())
    .map((item) => scoreCandidate(track, item))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)

  const best = candidates[0]

  if (!best || best.score < AMBIGUOUS_THRESHOLD) {
    return {
      sourceTrackId: track.internalId,
      sourceTitle: track.name,
      sourceArtist: track.artist,
      sourceDurationSeconds: track.durationSeconds,
      confidence: best?.score ?? 0,
      status: 'not_found',
      queryUsed,
      candidates
    }
  }

  const status = best.score >= AUTO_MATCH_THRESHOLD ? 'matched' : 'ambiguous'

  return {
    sourceTrackId: track.internalId,
    sourceTitle: track.name,
    sourceArtist: track.artist,
    sourceDurationSeconds: track.durationSeconds,
    spotifyTrackId: best.spotifyTrackId,
    spotifyUri: best.spotifyUri,
    title: best.title,
    artists: best.artists,
    album: best.album,
    durationMs: best.durationMs,
    externalUrl: best.externalUrl,
    confidence: best.score,
    status,
    queryUsed,
    candidates
  }
}

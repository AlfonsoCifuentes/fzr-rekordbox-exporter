/**
 * Remove combining diacritical marks (accents) for accent-insensitive comparison.
 */
export function stripDiacritics(text: string): string {
  if (!text) return ''
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normalize a text string for matching:
 * - Lowercase & strip diacritics
 * - Remove common DJ/download noise tags: [FREE DOWNLOAD], (320kbps), (Master), etc.
 * - Remove audio file extensions
 * - Collapse multiple spaces and trim
 */
export function normalizeText(text: string): string {
  if (!text) return ''
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/\[(free\s*(download|dl)|promo|master|hq|wav|flac|320\s*kbps|out\s*now)\]/gi, '')
    .replace(/\((320\s*kbps|master|mastered|clean|dirty|explicit|radio\s*edit|official\s*(audio|video|music\s*video)|hq|free\s*download)\)/gi, '')
    .replace(/\.(mp3|wav|flac|aiff|aif|ogg|m4a|alac|aac)$/gi, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract base title and mix/remix descriptor from a track title.
 * Example: "Energy Flash (Extended Mix)" -> { base: "energy flash", mix: "extended mix" }
 * Example: "Strings of Life (Danny Krivit Remix)" -> { base: "strings of life", mix: "danny krivit remix" }
 */
export function splitTitleAndMix(title: string): { base: string; mix: string } {
  const norm = normalizeText(title)
  if (!norm) return { base: '', mix: '' }

  // Match trailing parenthetical/bracketed mix or remix info
  const parenMatch = norm.match(/^(.*?)\s*[\(\[]([^)\]]*(?:mix|remix|edit|rework|dub|vip|version|bootleg|flip|mashup|extended|original|club|instrumental|vocal|acoustic|live|remaster(?:ed)?))[\)\]]\s*$/i)
  if (parenMatch) {
    return {
      base: parenMatch[1].trim(),
      mix: parenMatch[2].trim()
    }
  }

  // Match " - Extended Mix" or " - XXX Remix" suffix (Spotify style!)
  const dashMatch = norm.match(/^(.*?)\s+-\s+(.+?(?:mix|remix|edit|rework|dub|vip|version|extended|original|club|instrumental|vocal|acoustic|live|remaster(?:ed)?))$/i)
  if (dashMatch) {
    return {
      base: dashMatch[1].trim(),
      mix: dashMatch[2].trim()
    }
  }

  return { base: norm, mix: '' }
}

/**
 * Split an artist string into all individual normalized artists.
 */
export function extractArtists(artist: string): string[] {
  if (!artist) return []
  return artist
    .split(/\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+vs\.?\s+|\s+&\s+|\s+x\s+|,|;|\//i)
    .map((part) => normalizeText(part))
    .filter(Boolean)
}

/**
 * Normalize an artist string.
 * Splits on feat., ft., vs, &, comma and returns the primary artist.
 */
export function normalizePrimaryArtist(artist: string): string {
  if (!artist) return ''
  const primary = artist
    .split(/\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+vs\.?\s+|\s+&\s+|,/i)[0]
  return normalizeText(primary)
}

/**
 * Strip non-alphanumeric characters (keeping spaces) for cleaner token comparison.
 */
export function alphanumericTokens(text: string): string[] {
  const cleaned = normalizeText(text).replace(/[^a-z0-9\s]/g, ' ')
  return cleaned.split(/\s+/).filter(Boolean)
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let curr = new Array<number>(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1]
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
      }
    }
    const tmp = prev
    prev = curr
    curr = tmp
  }
  return prev[n]
}

/**
 * Similarity ratio 0-1 based on Levenshtein.
 */
export function similarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return Math.max(0, 1 - levenshtein(a, b) / maxLen)
}

/**
 * Token overlap similarity (Dice coefficient over word sets) 0-1.
 * Handles word order differences and extra/missing punctuation cleanly.
 */
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(alphanumericTokens(a))
  const tokensB = new Set(alphanumericTokens(b))
  if (tokensA.size === 0 && tokensB.size === 0) return 1
  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let overlap = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++
  }
  return (2 * overlap) / (tokensA.size + tokensB.size)
}

/**
 * Combined string similarity taking the best blend of character and token similarity.
 */
export function fuzzySimilarity(a: string, b: string): number {
  const normA = normalizeText(a).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const normB = normalizeText(b).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normA && !normB) return 1
  if (!normA || !normB) return 0
  if (normA === normB) return 1
  const lev = similarity(normA, normB)
  const tok = tokenSimilarity(normA, normB)
  return Math.max(lev, tok * 0.95, lev * 0.6 + tok * 0.4)
}

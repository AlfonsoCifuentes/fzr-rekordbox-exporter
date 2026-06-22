/**
 * Normalize a text string for matching:
 * - Lowercase
 * - Remove common noise tags: [FREE DOWNLOAD], (320kbps), (Master), etc.
 * - Collapse multiple spaces
 * - Trim
 */
export function normalizeText(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/\[free\s*download\]/gi, '')
    .replace(/\(320\s*kbps\)/gi, '')
    .replace(/\(master\)/gi, '')
    .replace(/\(clean\)/gi, '')
    .replace(/\(dirty\)/gi, '')
    .replace(/\(explicit\)/gi, '')
    .replace(/\(radio\s*edit\)/gi, '')
    .replace(/\.(mp3|wav|flac|aiff|aif|ogg|m4a)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize an artist string.
 * Splits on feat., ft., vs, & and returns the primary artist.
 */
export function normalizePrimaryArtist(artist: string): string {
  if (!artist) return ''
  const primary = artist
    .split(/\s+feat\.?\s+|\s+ft\.?\s+|\s+vs\.?\s+|\s+&\s+|,/i)[0]
  return normalizeText(primary)
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/**
 * Similarity ratio 0-1 based on Levenshtein.
 */
export function similarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

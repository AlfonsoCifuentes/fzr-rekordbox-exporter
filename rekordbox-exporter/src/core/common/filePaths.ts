/**
 * Shared path, URI, filename, and text-encoding helpers for Rekordbox / Traktor.
 */

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
])

/**
 * Strip UTF-8 / UTF-16 BOM character if present at the start of a string.
 */
export function stripBom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
}

/**
 * Decode a raw file Buffer supporting UTF-16 LE BOM (Rekordbox TXT default!),
 * UTF-16 BE BOM, UTF-8 BOM, and plain UTF-8.
 */
export function decodeTextBuffer(buf: Buffer): string {
  if (buf.length >= 2) {
    // UTF-16 LE BOM: FF FE
    if (buf[0] === 0xff && buf[1] === 0xfe) {
      return stripBom(buf.subarray(2).toString('utf16le'))
    }
    // UTF-16 BE BOM: FE FF
    if (buf[0] === 0xfe && buf[1] === 0xff) {
      const body = buf.subarray(2)
      const swapped = Buffer.alloc(body.length)
      for (let i = 0; i + 1 < body.length; i += 2) {
        swapped[i] = body[i + 1]
        swapped[i + 1] = body[i]
      }
      return stripBom(swapped.toString('utf16le'))
    }
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString('utf-8')
  }
  return stripBom(buf.toString('utf-8'))
}

/**
 * Safely percent-decode a URI segment without crashing on literal '%' signs
 * (e.g., "100% Techno.mp3" or "50%25 Off.mp3").
 */
export function safeDecodeURIComponent(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch {
    // Decode only valid %XX sequences while leaving stray '%' intact
    return input.replace(/%([0-9A-Fa-f]{2})/g, (match) => {
      try {
        return decodeURIComponent(match)
      } catch {
        return match
      }
    })
  }
}

/**
 * Convert a Rekordbox Location URI (or plain path) to a local file path.
 *
 * Handles:
 * - file://localhost/C:/Music/Artist%20A/Track.mp3 -> C:/Music/Artist A/Track.mp3
 * - file:///C:/Music/Artist%20A/Track.mp3          -> C:/Music/Artist A/Track.mp3
 * - file://localhost/Volumes/USB/Track.mp3         -> /Volumes/USB/Track.mp3
 * - file:///Volumes/USB/Track.mp3                  -> /Volumes/USB/Track.mp3
 * - Plain paths (returned untouched)
 */
export function decodeFileUri(location: string | undefined): string | undefined {
  if (!location) return undefined
  const trimmed = location.trim()
  if (!trimmed) return undefined

  if (!/^file:\/\//i.test(trimmed)) {
    return trimmed
  }

  // Strip "file://localhost" or "file://"
  let raw = trimmed.replace(/^file:\/\/localhost(?=\/)/i, '')
  if (raw === trimmed) {
    raw = trimmed.replace(/^file:\/\//i, '')
  }

  const decoded = safeDecodeURIComponent(raw)
  // On Windows, strip leading slash before drive letter: /C:/Music -> C:/Music
  return decoded.replace(/^\/([A-Za-z]:)/, '$1')
}

/**
 * Sanitize a playlist or folder name so it is safe on Windows/macOS/Linux filesystems.
 */
export function sanitizeFilename(name: string, fallback = 'playlist'): string {
  let safe = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')

  if (!safe) safe = fallback
  if (WINDOWS_RESERVED_NAMES.has(safe.toUpperCase())) {
    safe = `${safe}_`
  }
  return safe.slice(0, 120)
}

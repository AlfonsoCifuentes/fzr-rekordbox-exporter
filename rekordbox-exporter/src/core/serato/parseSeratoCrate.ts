import { randomUUID } from 'crypto'
import type { ParseResult, Track, Playlist } from '../common/types'

/**
 * Parse a binary Serato DJ `.crate` file (Big-Endian TLV format).
 *
 * Serato `.crate` layout:
 *   - 4-byte ASCII tag (e.g. 'vrsn', 'otrk', 'ptrk')
 *   - 4-byte uint32 big-endian payload length
 *   - Payload bytes:
 *       * 'otrk': nested container holding 'ptrk'
 *       * 'ptrk': UTF-16BE encoded track path (relative to drive root on Windows/macOS)
 */
export function parseSeratoCrate(buffer: Buffer, sourceFileName: string): ParseResult {
  const warnings: string[] = []
  const tracks: Track[] = []

  if (buffer.length < 8) {
    throw new Error('El archivo .crate de Serato es demasiado pequeño o está corrupto')
  }

  const headerTag = buffer.subarray(0, 4).toString('ascii')
  if (headerTag !== 'vrsn') {
    throw new Error('El archivo no es un Serato .crate válido (falta cabecera "vrsn")')
  }

  let offset = 0
  while (offset + 8 <= buffer.length) {
    const tag = buffer.subarray(offset, offset + 4).toString('ascii')
    const len = buffer.readUInt32BE(offset + 4)
    offset += 8

    if (offset + len > buffer.length) {
      warnings.push(`Bloque "${tag}" truncado en el archivo .crate`)
      break
    }

    const payload = buffer.subarray(offset, offset + len)
    offset += len

    if (tag === 'otrk') {
      const trackPath = extractPtrkPath(payload)
      if (trackPath) {
        const cleanPath = normalizeSeratoPath(trackPath)
        const { artist, name } = inferMetaFromFilename(cleanPath)
        tracks.push({
          internalId: randomUUID(),
          name: name || '(sin título)',
          artist: artist || '(artista desconocido)',
          location: cleanPath
        })
      }
    }
  }

  if (tracks.length === 0) {
    warnings.push('No se encontraron pistas dentro del archivo .crate de Serato')
  }

  // Serato crate names use "%%" for subcrate hierarchy (e.g., "Techno%%Peak Time.crate")
  const rawBase = sourceFileName.replace(/\.crate$/i, '')
  const pathParts = rawBase.split('%%').map((s) => s.trim()).filter(Boolean)
  const playlistName = pathParts[pathParts.length - 1] || 'Serato Crate'

  const playlist: Playlist = {
    id: randomUUID(),
    name: playlistName,
    path: pathParts.length > 0 ? pathParts : [playlistName],
    tracks
  }

  return { tracks, playlists: [playlist], warnings }
}

function extractPtrkPath(otrkPayload: Buffer): string | null {
  let pos = 0
  while (pos + 8 <= otrkPayload.length) {
    const subTag = otrkPayload.subarray(pos, pos + 4).toString('ascii')
    const subLen = otrkPayload.readUInt32BE(pos + 4)
    pos += 8
    if (pos + subLen > otrkPayload.length) break
    if (subTag === 'ptrk') {
      return decodeUtf16Be(otrkPayload.subarray(pos, pos + subLen))
    }
    pos += subLen
  }
  return null
}

function decodeUtf16Be(buf: Buffer): string {
  const swapped = Buffer.alloc(buf.length - (buf.length % 2))
  for (let i = 0; i + 1 < buf.length; i += 2) {
    swapped[i] = buf[i + 1]
    swapped[i + 1] = buf[i]
  }
  return swapped.toString('utf16le').replace(/\0+$/, '').trim()
}

function normalizeSeratoPath(rawPath: string): string {
  const p = rawPath.replace(/\\/g, '/').trim()
  // Serato omits leading slash on POSIX/macOS or drive letter on Windows ("Users/dj/..." or "Music/...")
  if (/^[A-Za-z]:\//.test(p) || p.startsWith('/')) return p
  return `/${p}`
}

function inferMetaFromFilename(filePath: string): { artist: string; name: string } {
  const file = filePath.split(/[\\/]/).pop() ?? ''
  const stem = file.replace(/\.[^.]+$/, '').trim()
  const dashIdx = stem.indexOf(' - ')
  if (dashIdx > 0) {
    return {
      artist: stem.slice(0, dashIdx).trim(),
      name: stem.slice(dashIdx + 3).trim()
    }
  }
  return { artist: '', name: stem }
}

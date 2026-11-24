import type { ParseResult } from '../common/types'
import { parseRekordboxXml } from './parseRekordboxXml'
import { parseRekordboxM3u8 } from './parseRekordboxM3u8'
import { parseRekordboxTxt } from './parseRekordboxTxt'
import { parseTraktorNml } from '../traktor/parseTraktorNml'
import { parsePlaylistCsv } from './parsePlaylistCsv'

export type SupportedFormat = 'xml' | 'nml' | 'm3u8' | 'm3u' | 'txt' | 'csv'

/**
 * Detect the DJ export format from the file extension.
 */
export function detectFormat(filePath: string): SupportedFormat {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'xml') return 'xml'
  if (ext === 'nml') return 'nml'
  if (ext === 'm3u8') return 'm3u8'
  if (ext === 'm3u') return 'm3u'
  if (ext === 'txt') return 'txt'
  if (ext === 'csv') return 'csv'
  throw new Error(
    `Formato no soportado: .${ext}. ` +
      'Los formatos soportados son: .xml (Rekordbox), .nml (Traktor), .m3u8 / .m3u, .txt (Rekordbox) y .csv (Exportify/Soundiiz/Streaming).'
  )
}

/**
 * Parse any supported DJ export file given its content and path.
 * Dispatches to the appropriate parser based on file extension.
 */
export function parseRekordboxFile(content: string, filePath: string): ParseResult {
  const format = detectFormat(filePath)
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath

  switch (format) {
    case 'xml':
      return parseRekordboxXml(content)
    case 'nml':
      return parseTraktorNml(content, fileName)
    case 'm3u8':
    case 'm3u':
      return parseRekordboxM3u8(content, fileName)
    case 'txt':
      return parseRekordboxTxt(content, fileName)
    case 'csv':
      return parsePlaylistCsv(content, fileName)
  }
}

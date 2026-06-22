import type { ParseResult } from '../common/types'
import { parseRekordboxXml } from './parseRekordboxXml'
import { parseRekordboxM3u8 } from './parseRekordboxM3u8'
import { parseRekordboxTxt } from './parseRekordboxTxt'

export type SupportedFormat = 'xml' | 'm3u8' | 'm3u' | 'txt'

/**
 * Detect the Rekordbox export format from the file extension.
 */
export function detectFormat(filePath: string): SupportedFormat {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'xml') return 'xml'
  if (ext === 'm3u8') return 'm3u8'
  if (ext === 'm3u') return 'm3u'
  if (ext === 'txt') return 'txt'
  throw new Error(
    `Formato no soportado: .${ext}. ` +
      'Los formatos soportados son: .xml (Rekordbox XML), .m3u8 / .m3u (playlist M3U), .txt (exportación de texto de Rekordbox).'
  )
}

/**
 * Parse any Rekordbox export file given its content and path.
 * Dispatches to the appropriate parser based on file extension.
 */
export function parseRekordboxFile(content: string, filePath: string): ParseResult {
  const format = detectFormat(filePath)
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath

  switch (format) {
    case 'xml':
      return parseRekordboxXml(content)
    case 'm3u8':
    case 'm3u':
      return parseRekordboxM3u8(content, fileName)
    case 'txt':
      return parseRekordboxTxt(content, fileName)
  }
}

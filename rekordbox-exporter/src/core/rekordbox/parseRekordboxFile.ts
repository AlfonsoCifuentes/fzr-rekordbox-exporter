import type { ParseResult } from '../common/types'
import { parseRekordboxXml } from './parseRekordboxXml'
import { parseRekordboxM3u8 } from './parseRekordboxM3u8'
import { parseRekordboxTxt } from './parseRekordboxTxt'
import { parseTraktorNml } from '../traktor/parseTraktorNml'
import { parsePlaylistCsv } from './parsePlaylistCsv'
import { parseVirtualDjXml } from '../virtualdj/parseVirtualDjXml'
import { parseSeratoCrate } from '../serato/parseSeratoCrate'

export type SupportedFormat = 'xml' | 'nml' | 'm3u8' | 'm3u' | 'txt' | 'csv' | 'vdjfolder' | 'crate'

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
  if (ext === 'vdjfolder') return 'vdjfolder'
  if (ext === 'crate') return 'crate'
  throw new Error(
    `Formato no soportado: .${ext}. ` +
      'Los formatos soportados son: .xml (Rekordbox / VirtualDJ), .nml (Traktor), .crate (Serato), .vdjfolder (VirtualDJ), .m3u8 / .m3u, .txt y .csv.'
  )
}

/**
 * Parse any supported text-based DJ export file given its content and path.
 * Automatically distinguishes Rekordbox XML vs VirtualDJ XML.
 */
export function parseRekordboxFile(content: string, filePath: string): ParseResult {
  const format = detectFormat(filePath)
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath

  switch (format) {
    case 'xml':
      if (/<VirtualDJ_Database\b|<VirtualFolder\b/i.test(content)) {
        return parseVirtualDjXml(content, fileName)
      }
      return parseRekordboxXml(content)
    case 'vdjfolder':
      return parseVirtualDjXml(content, fileName)
    case 'nml':
      return parseTraktorNml(content, fileName)
    case 'm3u8':
    case 'm3u':
      return parseRekordboxM3u8(content, fileName)
    case 'txt':
      return parseRekordboxTxt(content, fileName)
    case 'csv':
      return parsePlaylistCsv(content, fileName)
    case 'crate':
      throw new Error('Los archivos binarios .crate de Serato deben cargarse mediante parseDjFileBuffer.')
  }
}

/**
 * Parse any supported DJ file directly from a raw Buffer (supports binary Serato .crate + UTF-16/UTF-8 text formats).
 */
export function parseDjBuffer(
  buffer: Buffer,
  filePath: string,
  decodeText: (b: Buffer) => string
): ParseResult {
  const format = detectFormat(filePath)
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath
  if (format === 'crate') {
    return parseSeratoCrate(buffer, fileName)
  }
  return parseRekordboxFile(decodeText(buffer), filePath)
}

import type { ParseResult, Playlist, ExportResult } from '../../core/common/types'

export type ElectronAPI = {
  openAndParse: () => Promise<{ filePath: string; parseResult: ParseResult } | null>
  openOutputDir: () => Promise<string | null>
  exportPlaylists: (
    playlists: Playlist[],
    options: { outputDir: string; exportM3U8: boolean; exportNml: boolean }
  ) => Promise<ExportResult[]>
  openFolder: (folderPath: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

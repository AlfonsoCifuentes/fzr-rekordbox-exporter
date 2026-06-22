import { contextBridge, ipcRenderer } from 'electron'
import type { Playlist } from '../core/common/types'

export type ElectronAPI = {
  openAndParse: () => Promise<{
    filePath: string
    parseResult: import('../core/common/types').ParseResult
  } | null>
  openOutputDir: () => Promise<string | null>
  exportPlaylists: (
    playlists: Playlist[],
    options: { outputDir: string; exportM3U8: boolean; exportNml: boolean }
  ) => Promise<import('../core/common/types').ExportResult[]>
  openFolder: (folderPath: string) => Promise<void>
}

const api: ElectronAPI = {
  openAndParse: () => ipcRenderer.invoke('rekordbox:openAndParse'),
  openOutputDir: () => ipcRenderer.invoke('dialog:openOutputDir'),
  exportPlaylists: (playlists, options) =>
    ipcRenderer.invoke('export:playlists', playlists, options),
  openFolder: (folderPath) => ipcRenderer.invoke('shell:openFolder', folderPath)
}

contextBridge.exposeInMainWorld('electronAPI', api)

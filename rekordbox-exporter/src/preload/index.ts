import { contextBridge, ipcRenderer } from 'electron'
import type { Playlist } from '../core/common/types'

export type SpotifyStatus = { loggedIn: boolean; displayName: string | null }
export type SpotifyProgressEvent = {
  playlistName: string
  stage: 'creating' | 'searching' | 'adding' | 'done'
  current: number
  total: number
  matched: number
  notFound: number
}
export type SpotifyExportResult = { playlistUrl: string; matched: number; notFound: number }

export type ElectronAPI = {
  openAndParse: () => Promise<{
    filePath: string
    parseResult: import('../core/common/types').ParseResult
  } | null>
  openOutputDir: () => Promise<string | null>
  exportPlaylists: (
    playlists: Playlist[],
    options: {
      outputDir: string
      exportM3U8: boolean
      exportNml: boolean
      exportSpotifyTxt: boolean
    }
  ) => Promise<import('../core/common/types').ExportResult[]>
  openFolder: (folderPath: string) => Promise<void>

  // Spotify
  spotifyGetClientId: () => Promise<string>
  spotifySetClientId: (clientId: string) => Promise<void>
  spotifyGetStatus: () => Promise<SpotifyStatus>
  spotifyLogin: (clientId: string) => Promise<{ success: boolean; displayName: string }>
  spotifyLogout: () => Promise<void>
  spotifyExportPlaylist: (playlist: Playlist) => Promise<SpotifyExportResult>
  onSpotifyProgress: (callback: (data: SpotifyProgressEvent) => void) => () => void
}

const api: ElectronAPI = {
  openAndParse: () => ipcRenderer.invoke('rekordbox:openAndParse'),
  openOutputDir: () => ipcRenderer.invoke('dialog:openOutputDir'),
  exportPlaylists: (playlists, options) =>
    ipcRenderer.invoke('export:playlists', playlists, options),
  openFolder: (folderPath) => ipcRenderer.invoke('shell:openFolder', folderPath),

  // Spotify
  spotifyGetClientId: () => ipcRenderer.invoke('spotify:getClientId'),
  spotifySetClientId: (clientId) => ipcRenderer.invoke('spotify:setClientId', clientId),
  spotifyGetStatus: () => ipcRenderer.invoke('spotify:getStatus'),
  spotifyLogin: (clientId) => ipcRenderer.invoke('spotify:login', clientId),
  spotifyLogout: () => ipcRenderer.invoke('spotify:logout'),
  spotifyExportPlaylist: (playlist) => ipcRenderer.invoke('spotify:exportPlaylist', playlist),
  onSpotifyProgress: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, data: SpotifyProgressEvent): void =>
      callback(data)
    ipcRenderer.on('spotify:progress', handler)
    return () => ipcRenderer.removeListener('spotify:progress', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)


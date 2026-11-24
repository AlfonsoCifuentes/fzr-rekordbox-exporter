import { contextBridge, ipcRenderer } from 'electron'
import type {
  Playlist,
  Track,
  ParseResult,
  ExportResult,
  SpotifyMatch,
  SpotifyCandidate,
  ExportHistoryEntry
} from '../core/common/types'
import type {
  AutopilotConfig,
  AutopilotProgressEvent,
  AutopilotSessionState
} from '../core/soulseek/types'

export type SpotifyStatus = { loggedIn: boolean; displayName: string | null }

export type SpotifyProgressEvent = {
  playlistName: string
  stage: 'creating' | 'searching' | 'adding' | 'done'
  current: number
  total: number
  matched: number
  ambiguous: number
  notFound: number
  currentTrack?: string
}

export type SpotifyExportResult = {
  playlistUrl: string
  matched: number
  notFound: number
  unmatchedTracks: Array<{ artist: string; name: string }>
}

export type ExportPlaylistsOptions = {
  outputDir: string
  exportM3U8: boolean
  exportNml: boolean
  exportRekordboxXml?: boolean
  exportSetlist?: boolean
  exportCueSheet?: boolean
  exportPrepSheetHtml?: boolean
  exportStreamingCsv?: boolean
  exportSpotifyTxt: boolean
  playlistNamePrefix?: string
  preserveFolders?: boolean
  relativeM3uPaths?: boolean
  copyAudioFiles?: boolean
  spotifyMatchesByPlaylist?: Record<string, SpotifyMatch[]>
  spotifyUrlsByPlaylist?: Record<string, string>
}

export type AutoRelocateResult = {
  playlists: Playlist[]
  relocatedCount: number
  scannedCount: number
  rootDir: string
}

export type ElectronAPI = {
  openAndParse: () => Promise<{ filePath: string; parseResult: ParseResult } | null>
  parsePath: (filePath: string) => Promise<{ filePath: string; parseResult: ParseResult }>
  importSpotifyUrl: (urlOrId: string) => Promise<{ filePath: string; parseResult: ParseResult }>
  checkFilesExist: (paths: string[]) => Promise<Record<string, boolean>>
  autoRelocate: (playlists: Playlist[]) => Promise<AutoRelocateResult | null>
  openOutputDir: () => Promise<string | null>
  exportPlaylists: (
    playlists: Playlist[],
    options: ExportPlaylistsOptions
  ) => Promise<ExportResult[]>
  openFolder: (folderPath: string) => Promise<void>
  openExternal: (url: string) => Promise<void>

  // History
  getHistory: () => Promise<ExportHistoryEntry[]>
  addHistory: (entry: Omit<ExportHistoryEntry, 'id'>) => Promise<void>
  clearHistory: () => Promise<void>

  // Spotify
  spotifyGetClientId: () => Promise<string>
  spotifySetClientId: (clientId: string) => Promise<void>
  spotifyGetStatus: () => Promise<SpotifyStatus>
  spotifyLogin: (clientId: string) => Promise<{ success: boolean; displayName: string }>
  spotifyCancelLogin: () => Promise<void>
  spotifyLogout: () => Promise<void>
  spotifyClearCache: () => Promise<void>
  spotifyMatchPlaylist: (playlist: Playlist) => Promise<SpotifyMatch[]>
  spotifyCancelOperation: () => Promise<void>
  spotifySearchManual: (query: string, track: Track) => Promise<SpotifyCandidate[]>
  spotifySaveManualMatch: (track: Track, match: SpotifyMatch) => Promise<void>
  spotifyCreatePlaylist: (
    playlistName: string,
    matches: SpotifyMatch[],
    options?: { isPublic?: boolean }
  ) => Promise<SpotifyExportResult>
  spotifyExportPlaylist: (
    playlist: Playlist,
    options?: { isPublic?: boolean }
  ) => Promise<SpotifyExportResult>
  onSpotifyProgress: (callback: (data: SpotifyProgressEvent) => void) => () => void

  // Soulseek Autopilot
  soulseekGetConfig: () => Promise<AutopilotConfig>
  soulseekSaveConfig: (config: AutopilotConfig) => Promise<void>
  soulseekTestLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  soulseekGetSavedState: () => Promise<AutopilotSessionState | null>
  soulseekClearSavedState: () => Promise<void>
  soulseekStart: (
    playlist: Playlist,
    config: AutopilotConfig,
    resumeState?: AutopilotSessionState
  ) => Promise<AutopilotProgressEvent>
  soulseekPause: () => Promise<void>
  soulseekResume: () => Promise<void>
  soulseekCancel: () => Promise<void>
  onSoulseekProgress: (callback: (data: AutopilotProgressEvent) => void) => () => void
}

const api: ElectronAPI = {
  openAndParse: () => ipcRenderer.invoke('rekordbox:openAndParse'),
  parsePath: (filePath) => ipcRenderer.invoke('rekordbox:parsePath', filePath),
  importSpotifyUrl: (urlOrId) => ipcRenderer.invoke('import:spotifyUrl', urlOrId),
  checkFilesExist: (paths) => ipcRenderer.invoke('rekordbox:checkFilesExist', paths),
  autoRelocate: (playlists) => ipcRenderer.invoke('rekordbox:autoRelocate', playlists),
  openOutputDir: () => ipcRenderer.invoke('dialog:openOutputDir'),
  exportPlaylists: (playlists, options) =>
    ipcRenderer.invoke('export:playlists', playlists, options),
  openFolder: (folderPath) => ipcRenderer.invoke('shell:openFolder', folderPath),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // History
  getHistory: () => ipcRenderer.invoke('history:get'),
  addHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // Spotify
  spotifyGetClientId: () => ipcRenderer.invoke('spotify:getClientId'),
  spotifySetClientId: (clientId) => ipcRenderer.invoke('spotify:setClientId', clientId),
  spotifyGetStatus: () => ipcRenderer.invoke('spotify:getStatus'),
  spotifyLogin: (clientId) => ipcRenderer.invoke('spotify:login', clientId),
  spotifyCancelLogin: () => ipcRenderer.invoke('spotify:cancelLogin'),
  spotifyLogout: () => ipcRenderer.invoke('spotify:logout'),
  spotifyClearCache: () => ipcRenderer.invoke('spotify:clearCache'),
  spotifyMatchPlaylist: (playlist) => ipcRenderer.invoke('spotify:matchPlaylist', playlist),
  spotifyCancelOperation: () => ipcRenderer.invoke('spotify:cancelOperation'),
  spotifySearchManual: (query, track) => ipcRenderer.invoke('spotify:searchManual', query, track),
  spotifySaveManualMatch: (track, match) =>
    ipcRenderer.invoke('spotify:saveManualMatch', track, match),
  spotifyCreatePlaylist: (playlistName, matches, options) =>
    ipcRenderer.invoke('spotify:createPlaylist', playlistName, matches, options),
  spotifyExportPlaylist: (playlist, options) =>
    ipcRenderer.invoke('spotify:exportPlaylist', playlist, options),
  onSpotifyProgress: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, data: SpotifyProgressEvent): void =>
      callback(data)
    ipcRenderer.on('spotify:progress', handler)
    return () => ipcRenderer.removeListener('spotify:progress', handler)
  },

  // Soulseek Autopilot
  soulseekGetConfig: () => ipcRenderer.invoke('soulseek:getConfig'),
  soulseekSaveConfig: (config) => ipcRenderer.invoke('soulseek:saveConfig', config),
  soulseekTestLogin: (username, password) =>
    ipcRenderer.invoke('soulseek:testLogin', username, password),
  soulseekGetSavedState: () => ipcRenderer.invoke('soulseek:getSavedState'),
  soulseekClearSavedState: () => ipcRenderer.invoke('soulseek:clearSavedState'),
  soulseekStart: (playlist, config, resumeState) =>
    ipcRenderer.invoke('soulseek:start', playlist, config, resumeState),
  soulseekPause: () => ipcRenderer.invoke('soulseek:pause'),
  soulseekResume: () => ipcRenderer.invoke('soulseek:resume'),
  soulseekCancel: () => ipcRenderer.invoke('soulseek:cancel'),
  onSoulseekProgress: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, data: AutopilotProgressEvent): void =>
      callback(data)
    ipcRenderer.on('soulseek:progress', handler)
    return () => ipcRenderer.removeListener('soulseek:progress', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

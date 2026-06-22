import type { ParseResult, Playlist, ExportResult } from '../../core/common/types'

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
  openAndParse: () => Promise<{ filePath: string; parseResult: ParseResult } | null>
  openOutputDir: () => Promise<string | null>
  exportPlaylists: (
    playlists: Playlist[],
    options: {
      outputDir: string
      exportM3U8: boolean
      exportNml: boolean
      exportSpotifyTxt: boolean
    }
  ) => Promise<ExportResult[]>
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

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}


/// <reference types="vite/client" />
import type { ElectronAPI } from '../../preload/index'

export type {
  ElectronAPI,
  SpotifyStatus,
  SpotifyProgressEvent,
  SpotifyExportResult,
  ExportPlaylistsOptions
} from '../../preload/index'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

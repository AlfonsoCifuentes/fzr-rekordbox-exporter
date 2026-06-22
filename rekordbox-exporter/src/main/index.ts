import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { parseRekordboxFile } from '../core/rekordbox/parseRekordboxFile'
import { exportPlaylist } from '../core/traktor/exportTraktor'
import { performSpotifyLogin } from '../core/spotify/spotifyAuth'
import { getCurrentUser, exportPlaylistToSpotify } from '../core/spotify/spotifyApi'
import type { Playlist } from '../core/common/types'

// ---- Spotify session state -----------------------------------------------

let spotifyToken: string | null = null

function getSpotifyConfigPath(): string {
  return join(app.getPath('userData'), 'spotify-config.json')
}

function loadSpotifyClientId(): string {
  try {
    const raw = readFileSync(getSpotifyConfigPath(), 'utf-8')
    const parsed = JSON.parse(raw) as { clientId?: string }
    return parsed.clientId ?? ''
  } catch {
    return ''
  }
}

function saveSpotifyClientId(clientId: string): void {
  try {
    writeFileSync(getSpotifyConfigPath(), JSON.stringify({ clientId }), 'utf-8')
  } catch {
    // non-critical — ignore
  }
}

// ---- Window ----------------------------------------------------------------

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'FZR Rekordbox Exporter',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#0f0f0f'
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---- IPC Handlers --------------------------------------------------------

/** Open file dialog and parse — supports XML, M3U8/M3U and TXT from Rekordbox */
ipcMain.handle('rekordbox:openAndParse', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Seleccionar exportación de Rekordbox',
    filters: [
      {
        name: 'Exportaciones de Rekordbox',
        extensions: ['xml', 'm3u8', 'm3u', 'txt']
      },
      { name: 'Rekordbox XML', extensions: ['xml'] },
      { name: 'Playlist M3U8/M3U', extensions: ['m3u8', 'm3u'] },
      { name: 'Texto de Rekordbox (TXT)', extensions: ['txt'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  })

  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const content = readFileSync(filePath, 'utf-8')
  const parseResult = parseRekordboxFile(content, filePath)

  return { filePath, parseResult }
})

/** Open folder dialog for export destination */
ipcMain.handle('dialog:openOutputDir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Seleccionar carpeta de destino',
    properties: ['openDirectory', 'createDirectory']
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})

/** Export playlists to M3U8/NML/reports/Spotify-txt */
ipcMain.handle(
  'export:playlists',
  async (
    _event,
    playlists: Playlist[],
    options: {
      outputDir: string
      exportM3U8: boolean
      exportNml: boolean
      exportSpotifyTxt: boolean
    }
  ) => {
    const results = []

    for (const playlist of playlists) {
      const safePlaylistName = playlist.name.replace(/[<>:"/\\|?*]/g, '_')
      const playlistDir = join(options.outputDir, safePlaylistName)

      if (!existsSync(playlistDir)) {
        mkdirSync(playlistDir, { recursive: true })
      }

      const output = exportPlaylist(playlist, {
        outputDir: playlistDir,
        exportM3U8: options.exportM3U8,
        exportNml: options.exportNml
      })

      if (output.m3u8Content) {
        writeFileSync(join(playlistDir, `${safePlaylistName}.m3u8`), output.m3u8Content, 'utf-8')
      }
      if (output.nmlContent) {
        writeFileSync(join(playlistDir, `${safePlaylistName}.nml`), output.nmlContent, 'utf-8')
      }
      writeFileSync(join(playlistDir, `${safePlaylistName}_report.json`), output.reportJson, 'utf-8')
      writeFileSync(join(playlistDir, `${safePlaylistName}_report.csv`), output.reportCsv, 'utf-8')

      let spotifyTxtPath: string | undefined
      if (options.exportSpotifyTxt) {
        const lines = playlist.tracks.map((t) => `${t.artist} - ${t.name}`)
        const txtContent = lines.join('\r\n')
        spotifyTxtPath = join(playlistDir, `${safePlaylistName}_spotify.txt`)
        writeFileSync(spotifyTxtPath, txtContent, 'utf-8')
      }

      results.push({
        ...output.result,
        nmlPath: output.nmlContent ? join(playlistDir, `${safePlaylistName}.nml`) : undefined,
        m3uPath: output.m3u8Content ? join(playlistDir, `${safePlaylistName}.m3u8`) : undefined,
        reportJsonPath: join(playlistDir, `${safePlaylistName}_report.json`),
        reportCsvPath: join(playlistDir, `${safePlaylistName}_report.csv`),
        spotifyTxtPath
      })
    }

    return results
  }
)

/** Open folder in Explorer/Finder */
ipcMain.handle('shell:openFolder', async (_event, folderPath: string) => {
  const { shell } = await import('electron')
  await shell.openPath(folderPath)
})

// ---- Spotify IPC Handlers ------------------------------------------------

/** Get stored client_id */
ipcMain.handle('spotify:getClientId', () => loadSpotifyClientId())

/** Save client_id and persist */
ipcMain.handle('spotify:setClientId', (_event, clientId: string) => {
  saveSpotifyClientId(clientId)
})

/** Get current session status */
ipcMain.handle('spotify:getStatus', async () => {
  if (!spotifyToken) return { loggedIn: false, displayName: null }
  try {
    const user = await getCurrentUser(spotifyToken)
    return { loggedIn: true, displayName: user.display_name || user.id }
  } catch {
    spotifyToken = null
    return { loggedIn: false, displayName: null }
  }
})

/** Start OAuth PKCE login — opens browser, captures callback */
ipcMain.handle('spotify:login', async (_event, clientId: string) => {
  saveSpotifyClientId(clientId)
  spotifyToken = await performSpotifyLogin(clientId)
  const user = await getCurrentUser(spotifyToken)
  return { success: true, displayName: user.display_name || user.id }
})

/** Log out */
ipcMain.handle('spotify:logout', () => {
  spotifyToken = null
})

/** Export a single playlist to Spotify with progress events */
ipcMain.handle(
  'spotify:exportPlaylist',
  async (event, playlist: Playlist) => {
    if (!spotifyToken) throw new Error('No estás conectado a Spotify')

    const result = await exportPlaylistToSpotify(playlist, spotifyToken, (progress) => {
      event.sender.send('spotify:progress', { playlistName: playlist.name, ...progress })
    })

    return result
  }
)


import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, Notification, Menu } from 'electron'
import { join, basename, extname } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'fs'
import { randomUUID } from 'crypto'
import { parseDjBuffer } from '../core/rekordbox/parseRekordboxFile'
import { fetchPublicSpotifyPlaylist } from '../core/spotify/spotifyPublicImport'
import { SoulseekAutopilotEngine, testSoulseekLogin } from '../core/soulseek/autopilotEngine'
import type { AutopilotConfig, AutopilotSessionState } from '../core/soulseek/types'
import {
  loadAutopilotConfig,
  saveAutopilotConfig,
  loadAutopilotState,
  saveAutopilotState,
  clearAutopilotState
} from './soulseekStore'
import { detectDjEnvironment, parseSeratoCratesBatch } from './djAutoDetect'
import { buildRekordboxXml } from '../core/rekordbox/rekordboxXmlBuilder'
import {
  buildDjSetlistTxt,
  buildDjSetlistMarkdown,
  buildStreamingCsv,
  buildCueSheet,
  buildHtmlPrepSheet
} from '../core/export/extraExporters'
import { relocateTracksFromFileList } from '../core/analytics/playlistTools'
import { decodeTextBuffer, sanitizeFilename } from '../core/common/filePaths'
import { exportPlaylist } from '../core/traktor/exportTraktor'
import {
  performSpotifyLogin,
  refreshSpotifyToken,
  cancelActiveSpotifyLogin,
  type SpotifyTokens
} from '../core/spotify/spotifyAuth'
import {
  getCurrentUser,
  matchPlaylistTracks,
  searchManualCandidates,
  createSpotifyPlaylistFromMatches,
  exportPlaylistToSpotify
} from '../core/spotify/spotifyApi'
import { buildTrackFingerprint } from '../core/spotify/matchTracks'
import { MatchCache } from '../core/spotify/matchCache'
import type {
  Playlist,
  Track,
  SpotifyMatch,
  ExportHistoryEntry
} from '../core/common/types'

// ---- Persistent Config, Secure Tokens, Cache & History -------------------

type StoredSpotifyConfig = {
  clientId?: string
  encryptedTokens?: string // base64 safeStorage buffer
  plainTokens?: SpotifyTokens // fallback when safeStorage unavailable
}

let cachedTokens: SpotifyTokens | null = null
let activeAbortController: AbortController | null = null
let matchCache: MatchCache | null = null
const autopilotEngine = new SoulseekAutopilotEngine()

function getSpotifyConfigPath(): string {
  return join(app.getPath('userData'), 'spotify-config.json')
}

function getMatchCache(): MatchCache {
  if (!matchCache) {
    matchCache = new MatchCache(join(app.getPath('userData'), 'spotify-match-cache.json'))
  }
  return matchCache
}

function getHistoryPath(): string {
  return join(app.getPath('userData'), 'export-history.json')
}

function readSpotifyConfig(): StoredSpotifyConfig {
  try {
    const raw = readFileSync(getSpotifyConfigPath(), 'utf-8')
    return JSON.parse(raw) as StoredSpotifyConfig
  } catch {
    return {}
  }
}

function writeSpotifyConfig(cfg: StoredSpotifyConfig): void {
  try {
    writeFileSync(getSpotifyConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8')
  } catch {
    // non-critical
  }
}

function loadSpotifyClientId(): string {
  return readSpotifyConfig().clientId ?? ''
}

function saveSpotifyClientId(clientId: string): void {
  const cfg = readSpotifyConfig()
  cfg.clientId = clientId
  writeSpotifyConfig(cfg)
}

function loadStoredTokens(): SpotifyTokens | null {
  if (cachedTokens) return cachedTokens
  const cfg = readSpotifyConfig()
  try {
    if (cfg.encryptedTokens && safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(Buffer.from(cfg.encryptedTokens, 'base64'))
      cachedTokens = JSON.parse(decrypted) as SpotifyTokens
      return cachedTokens
    }
    if (cfg.plainTokens) {
      cachedTokens = cfg.plainTokens
      return cachedTokens
    }
  } catch {
    // Corrupted stored token — require re-login
  }
  return null
}

function saveStoredTokens(tokens: SpotifyTokens | null): void {
  cachedTokens = tokens
  const cfg = readSpotifyConfig()
  delete cfg.encryptedTokens
  delete cfg.plainTokens
  if (tokens) {
    if (safeStorage.isEncryptionAvailable()) {
      cfg.encryptedTokens = safeStorage.encryptString(JSON.stringify(tokens)).toString('base64')
    } else {
      cfg.plainTokens = tokens
    }
  }
  writeSpotifyConfig(cfg)
}

async function getValidSpotifyToken(): Promise<string> {
  const tokens = loadStoredTokens()
  if (!tokens) throw new Error('No estás conectado a Spotify')

  if (Date.now() < tokens.expiresAt) {
    return tokens.accessToken
  }

  // Try refreshing expired token automatically
  const clientId = loadSpotifyClientId()
  if (tokens.refreshToken && clientId) {
    try {
      const refreshed = await refreshSpotifyToken(tokens.refreshToken, clientId)
      saveStoredTokens(refreshed)
      return refreshed.accessToken
    } catch {
      saveStoredTokens(null)
      throw new Error('Tu sesión de Spotify caducó. Por favor inicia sesión de nuevo.')
    }
  }

  saveStoredTokens(null)
  throw new Error('Tu sesión de Spotify caducó. Por favor inicia sesión de nuevo.')
}

function loadHistory(): ExportHistoryEntry[] {
  try {
    if (!existsSync(getHistoryPath())) return []
    const raw = readFileSync(getHistoryPath(), 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ExportHistoryEntry[]) : []
  } catch {
    return []
  }
}

function appendHistory(entry: ExportHistoryEntry): void {
  try {
    const existing = loadHistory()
    const next = [entry, ...existing].slice(0, 20)
    writeFileSync(getHistoryPath(), JSON.stringify(next, null, 2), 'utf-8')
  } catch {
    // non-critical
  }
}

// ---- Window ----------------------------------------------------------------

function createWindow(): BrowserWindow {
  const iconPath = join(__dirname, '../../build-resources/icon.png')
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'FZR Rekordbox Exporter',
    icon: existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#07080c'
  })

  // Open external URLs in the user's default system browser instead of a blank Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  // Remove default Electron File/Edit/View menu bar for a clean studio app frame
  Menu.setApplicationMenu(null)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  cancelActiveSpotifyLogin()
  autopilotEngine.cancel()
  if (process.platform !== 'darwin') app.quit()
})

// ---- Rekordbox Import IPC Handlers ---------------------------------------

function parseLocalRekordboxFile(filePath: string) {
  const buffer = readFileSync(filePath)
  const parseResult = parseDjBuffer(buffer, filePath, decodeTextBuffer)
  return { filePath, parseResult }
}

/** Open file dialog and parse — supports Rekordbox, Traktor, Serato .crate, VirtualDJ, M3U8, TXT & CSV */
ipcMain.handle('rekordbox:openAndParse', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Seleccionar librería o playlist DJ',
    filters: [
      {
        name: 'Librerías DJ (Rekordbox / Traktor / Serato / VirtualDJ / CSV)',
        extensions: ['xml', 'nml', 'crate', 'vdjfolder', 'm3u8', 'm3u', 'txt', 'csv']
      },
      { name: 'Rekordbox / VirtualDJ XML', extensions: ['xml', 'vdjfolder'] },
      { name: 'Traktor Pro NML', extensions: ['nml'] },
      { name: 'Serato DJ Crate', extensions: ['crate'] },
      { name: 'Playlist M3U8/M3U', extensions: ['m3u8', 'm3u'] },
      { name: 'Texto de Rekordbox (TXT)', extensions: ['txt'] },
      { name: 'CSV Streaming (Exportify / Soundiiz)', extensions: ['csv'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  })

  if (canceled || filePaths.length === 0) return null
  return parseLocalRekordboxFile(filePaths[0])
})

/** Parse a specific file path (used by Drag & Drop and recent files) */
ipcMain.handle('rekordbox:parsePath', async (_event, filePath: string) => {
  if (!filePath || !existsSync(filePath)) {
    throw new Error('El archivo no existe o no se puede leer.')
  }
  return parseLocalRekordboxFile(filePath)
})

/** Check disk existence for a batch of file paths */
ipcMain.handle('rekordbox:checkFilesExist', async (_event, paths: string[]) => {
  const result: Record<string, boolean> = {}
  for (const p of paths) {
    if (!p) continue
    try {
      result[p] = existsSync(p)
    } catch {
      result[p] = false
    }
  }
  return result
})

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.flac', '.aiff', '.aif', '.m4a', '.ogg', '.alac', '.aac'
])

function scanAudioFiles(rootDir: string, maxFiles = 80000, maxDepth = 12): string[] {
  const found: string[] = []
  const walk = (dir: string, depth: number): void => {
    if (depth > maxDepth || found.length >= maxFiles) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (found.length >= maxFiles) return
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1)
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase()
        if (AUDIO_EXTENSIONS.has(ext)) {
          found.push(fullPath)
        }
      }
    }
  }
  walk(rootDir, 0)
  return found
}

/** Pick a local music root folder and automatically heal broken track paths */
ipcMain.handle('rekordbox:autoRelocate', async (_event, playlists: Playlist[]) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Seleccionar carpeta de música para relocalizar pistas faltantes',
    properties: ['openDirectory']
  })
  if (canceled || filePaths.length === 0) return null

  const rootDir = filePaths[0]
  const scannedFiles = scanAudioFiles(rootDir)

  const existingSet = new Set<string>()
  for (const pl of playlists) {
    for (const t of pl.tracks) {
      if (t.location && existsSync(t.location)) {
        existingSet.add(t.location)
      }
    }
  }

  const { playlists: updated, relocatedCount } = relocateTracksFromFileList(
    playlists,
    scannedFiles,
    existingSet
  )
  return {
    playlists: updated,
    relocatedCount,
    scannedCount: scannedFiles.length,
    rootDir
  }
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

// ---- Local Export IPC Handler --------------------------------------------

ipcMain.handle(
  'export:playlists',
  async (
    _event,
    playlists: Playlist[],
    options: {
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
  ) => {
    const results = []

    for (const rawPlaylist of playlists) {
      const prefix = options.playlistNamePrefix?.trim()
      const playlist: Playlist = prefix
        ? { ...rawPlaylist, name: `${prefix} ${rawPlaylist.name}`.trim() }
        : rawPlaylist
      const safePlaylistName = sanitizeFilename(playlist.name)

      // Respect nested Rekordbox folder hierarchy when requested
      let playlistDir: string
      if (options.preserveFolders && playlist.path.length > 1) {
        const folderSegments = playlist.path
          .slice(0, -1)
          .filter((seg) => seg.toUpperCase() !== 'ROOT')
          .map((seg) => sanitizeFilename(seg))
        playlistDir = join(options.outputDir, ...folderSegments, safePlaylistName)
      } else {
        playlistDir = join(options.outputDir, safePlaylistName)
      }

      if (!existsSync(playlistDir)) {
        mkdirSync(playlistDir, { recursive: true })
      }

      // Check local file existence + optionally copy audio files into playlistDir/audio
      const fileExistsMap = new Map<string, boolean>()
      const pathOverrides = new Map<string, string>()
      let copiedFilesCount = 0

      let audioDir: string | undefined
      if (options.copyAudioFiles) {
        audioDir = join(playlistDir, 'audio')
        if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true })
      }

      const usedAudioNames = new Set<string>()
      for (const track of playlist.tracks) {
        if (!track.location) {
          fileExistsMap.set(track.internalId, false)
          continue
        }
        const exists = existsSync(track.location)
        fileExistsMap.set(track.internalId, exists)

        if (exists && audioDir) {
          try {
            const origBase = basename(track.location)
            const ext = extname(origBase)
            const stem = sanitizeFilename(origBase.slice(0, origBase.length - ext.length), 'track')
            let candidate = `${stem}${ext}`
            let counter = 2
            while (usedAudioNames.has(candidate.toLowerCase())) {
              candidate = `${stem}_${counter}${ext}`
              counter++
            }
            usedAudioNames.add(candidate.toLowerCase())
            const destPath = join(audioDir, candidate)
            if (!existsSync(destPath)) {
              copyFileSync(track.location, destPath)
            }
            pathOverrides.set(track.internalId, destPath)
            copiedFilesCount++
          } catch {
            // Leave original path if copy fails
          }
        }
      }

      // Build Spotify match lookup map if available
      let spotifyMatchesMap: Map<string, SpotifyMatch> | undefined
      const playlistMatches = options.spotifyMatchesByPlaylist?.[playlist.id]
      if (playlistMatches && playlistMatches.length > 0) {
        spotifyMatchesMap = new Map(playlistMatches.map((m) => [m.sourceTrackId, m]))
      }

      const output = exportPlaylist(playlist, {
        outputDir: playlistDir,
        exportM3U8: options.exportM3U8,
        exportNml: options.exportNml,
        relativeM3uPaths: options.relativeM3uPaths || options.copyAudioFiles,
        pathOverrides: pathOverrides.size > 0 ? pathOverrides : undefined,
        fileExistsMap,
        spotifyMatches: spotifyMatchesMap,
        spotifyPlaylistUrl: options.spotifyUrlsByPlaylist?.[playlist.id]
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

      let rekordboxXmlPath: string | undefined
      if (options.exportRekordboxXml) {
        const rbXml = buildRekordboxXml([playlist], {
          pathOverrides: pathOverrides.size > 0 ? pathOverrides : undefined
        })
        rekordboxXmlPath = join(playlistDir, `${safePlaylistName}_rekordbox.xml`)
        writeFileSync(rekordboxXmlPath, rbXml, 'utf-8')
      }

      let setlistTxtPath: string | undefined
      let setlistMdPath: string | undefined
      if (options.exportSetlist) {
        setlistTxtPath = join(playlistDir, `${safePlaylistName}_setlist.txt`)
        setlistMdPath = join(playlistDir, `${safePlaylistName}_setlist.md`)
        writeFileSync(setlistTxtPath, buildDjSetlistTxt(playlist), 'utf-8')
        writeFileSync(setlistMdPath, buildDjSetlistMarkdown(playlist), 'utf-8')
      }

      let cueSheetPath: string | undefined
      if (options.exportCueSheet) {
        cueSheetPath = join(playlistDir, `${safePlaylistName}.cue`)
        writeFileSync(cueSheetPath, buildCueSheet(playlist), 'utf-8')
      }

      let prepSheetHtmlPath: string | undefined
      if (options.exportPrepSheetHtml) {
        prepSheetHtmlPath = join(playlistDir, `${safePlaylistName}_booth_prep.html`)
        writeFileSync(prepSheetHtmlPath, buildHtmlPrepSheet(playlist), 'utf-8')
      }

      let streamingCsvPath: string | undefined
      if (options.exportStreamingCsv) {
        streamingCsvPath = join(playlistDir, `${safePlaylistName}_streaming.csv`)
        writeFileSync(streamingCsvPath, buildStreamingCsv(playlist), 'utf-8')
      }

      results.push({
        ...output.result,
        copiedFilesCount: options.copyAudioFiles ? copiedFilesCount : undefined,
        nmlPath: output.nmlContent ? join(playlistDir, `${safePlaylistName}.nml`) : undefined,
        m3uPath: output.m3u8Content ? join(playlistDir, `${safePlaylistName}.m3u8`) : undefined,
        rekordboxXmlPath,
        setlistTxtPath,
        setlistMdPath,
        cueSheetPath,
        prepSheetHtmlPath,
        streamingCsvPath,
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
  if (folderPath) {
    await shell.openPath(folderPath)
  }
})

/** Safely open external HTTP(S) URL in default system browser */
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url)
  }
})

// ---- History IPC Handlers ------------------------------------------------

ipcMain.handle('history:get', () => loadHistory())

ipcMain.handle('history:add', (_event, entry: Omit<ExportHistoryEntry, 'id'>) => {
  appendHistory({ ...entry, id: randomUUID() })
})

ipcMain.handle('history:clear', () => {
  try {
    writeFileSync(getHistoryPath(), '[]', 'utf-8')
  } catch {
    // ignore
  }
})

// ---- Spotify IPC Handlers ------------------------------------------------

ipcMain.handle('spotify:getClientId', () => loadSpotifyClientId())

ipcMain.handle('spotify:setClientId', (_event, clientId: string) => {
  saveSpotifyClientId(clientId)
})

ipcMain.handle('spotify:getStatus', async () => {
  try {
    const token = await getValidSpotifyToken()
    const user = await getCurrentUser(token)
    return { loggedIn: true, displayName: user.display_name || user.id }
  } catch {
    return { loggedIn: false, displayName: null }
  }
})

ipcMain.handle('spotify:login', async (_event, clientId: string) => {
  saveSpotifyClientId(clientId)
  const tokens = await performSpotifyLogin(clientId)
  saveStoredTokens(tokens)
  const user = await getCurrentUser(tokens.accessToken)
  return { success: true, displayName: user.display_name || user.id }
})

ipcMain.handle('spotify:cancelLogin', () => {
  cancelActiveSpotifyLogin()
})

ipcMain.handle('spotify:logout', () => {
  cancelActiveSpotifyLogin()
  saveStoredTokens(null)
})

ipcMain.handle('spotify:clearCache', () => {
  getMatchCache().clear()
})

/** Match all tracks of a playlist against Spotify (with progress & caching) */
ipcMain.handle('spotify:matchPlaylist', async (event, playlist: Playlist) => {
  const token = await getValidSpotifyToken()
  activeAbortController?.abort()
  activeAbortController = new AbortController()

  try {
    return await matchPlaylistTracks(playlist, token, {
      cache: getMatchCache(),
      signal: activeAbortController.signal,
      onProgress: (progress) => {
        event.sender.send('spotify:progress', { playlistName: playlist.name, ...progress })
      }
    })
  } finally {
    activeAbortController = null
  }
})

/** Cancel any in-flight Spotify matching/export */
ipcMain.handle('spotify:cancelOperation', () => {
  activeAbortController?.abort()
  activeAbortController = null
})

/** Manual search in Spotify from the Review screen */
ipcMain.handle('spotify:searchManual', async (_event, query: string, track: Track) => {
  const token = await getValidSpotifyToken()
  return searchManualCandidates(query, track, token)
})

/** Persist a manual user match choice in local cache */
ipcMain.handle('spotify:saveManualMatch', (_event, track: Track, match: SpotifyMatch) => {
  const cache = getMatchCache()
  cache.set(buildTrackFingerprint(track), match)
  cache.flush()
})

/** Create a Spotify playlist from reviewed SpotifyMatch[] */
ipcMain.handle(
  'spotify:createPlaylist',
  async (
    event,
    playlistName: string,
    matches: SpotifyMatch[],
    options?: { isPublic?: boolean }
  ) => {
    const token = await getValidSpotifyToken()
    activeAbortController?.abort()
    activeAbortController = new AbortController()

    try {
      return await createSpotifyPlaylistFromMatches(playlistName, matches, token, {
        isPublic: options?.isPublic ?? false,
        signal: activeAbortController.signal,
        onProgress: (progress) => {
          event.sender.send('spotify:progress', { playlistName, ...progress })
        }
      })
    } finally {
      activeAbortController = null
    }
  }
)

/** One-shot export playlist directly to Spotify (kept for quick export mode) */
ipcMain.handle(
  'spotify:exportPlaylist',
  async (event, playlist: Playlist, options?: { isPublic?: boolean }) => {
    const token = await getValidSpotifyToken()
    activeAbortController?.abort()
    activeAbortController = new AbortController()

    try {
      return await exportPlaylistToSpotify(
        playlist,
        token,
        (progress) => {
          event.sender.send('spotify:progress', { playlistName: playlist.name, ...progress })
        },
        {
          isPublic: options?.isPublic ?? false,
          cache: getMatchCache(),
          signal: activeAbortController.signal
        }
      )
    } finally {
      activeAbortController = null
    }
  }
)

// ---- DJ Software Auto-Detector & Multi-Crate Loader ----------------------

ipcMain.handle('system:detectDjEnvironment', () => {
  return detectDjEnvironment()
})

ipcMain.handle('rekordbox:parseSeratoCrates', (_event, cratePaths: string[]) => {
  if (!Array.isArray(cratePaths) || cratePaths.length === 0) {
    throw new Error('No se encontraron archivos .crate para importar.')
  }
  const parseResult = parseSeratoCratesBatch(cratePaths)
  return {
    filePath: `Serato DJ (${cratePaths.length} crates)`,
    parseResult
  }
})

ipcMain.handle('shell:launchApp', async (_event, exePath: string) => {
  if (exePath && existsSync(exePath)) {
    await shell.openPath(exePath)
  }
})

// ---- Public Spotify URL Importer & Soulseek Autopilot IPC Handlers -------

ipcMain.handle('import:spotifyUrl', async (_event, urlOrId: string) => {
  return fetchPublicSpotifyPlaylist(urlOrId)
})

ipcMain.handle('soulseek:getConfig', () => loadAutopilotConfig())

ipcMain.handle('soulseek:saveConfig', (_event, config: AutopilotConfig) => {
  saveAutopilotConfig(config)
})

ipcMain.handle('soulseek:testLogin', async (_event, username: string, password: string) => {
  return testSoulseekLogin(username, password)
})

ipcMain.handle('soulseek:getSavedState', () => loadAutopilotState())

ipcMain.handle('soulseek:clearSavedState', () => {
  clearAutopilotState()
})

ipcMain.handle(
  'soulseek:start',
  async (
    event,
    playlist: Playlist,
    config: AutopilotConfig,
    resumeState?: AutopilotSessionState
  ) => {
    saveAutopilotConfig(config)
    return autopilotEngine.run(
      playlist,
      config,
      {
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('soulseek:progress', progress)
          }
        },
        onSaveState: (state) => saveAutopilotState(state),
        onClearState: () => clearAutopilotState(),
        onCompleteNotification: (title, body) => {
          try {
            if (Notification.isSupported()) {
              new Notification({ title, body }).show()
            }
          } catch {
            // ignore notification errors
          }
        }
      },
      resumeState
    )
  }
)

ipcMain.handle('soulseek:pause', () => {
  autopilotEngine.pause()
})

ipcMain.handle('soulseek:resume', () => {
  autopilotEngine.resume()
})

ipcMain.handle('soulseek:cancel', () => {
  autopilotEngine.cancel()
})

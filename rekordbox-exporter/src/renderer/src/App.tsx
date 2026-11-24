import React, { useEffect, useState } from 'react'
import type {
  DetectedDjEnvironment,
  ParseResult,
  Playlist,
  ExportResult,
  SpotifyMatch
} from '../../core/common/types'
import { FzrEmblem, MiniRgbWaveform } from './components/StudioIcons'
import HomeScreen from './screens/HomeScreen'
import PlaylistsScreen from './screens/PlaylistsScreen'
import ExportScreen, { type PendingExportConfig } from './screens/ExportScreen'
import ReviewScreen from './screens/ReviewScreen'
import ResultsScreen from './screens/ResultsScreen'
import AutopilotScreen from './screens/AutopilotScreen'
import styles from './App.module.css'

export type Screen =
  | 'home'
  | 'playlists'
  | 'export'
  | 'review'
  | 'results'
  | 'autopilot'

export type AppState = {
  sourceFilePath: string | null
  parseResult: ParseResult | null
  selectedPlaylists: Playlist[]
  pendingExportConfig: PendingExportConfig | null
  spotifyMatchesByPlaylist: Record<string, SpotifyMatch[]>
  exportResults: ExportResult[]
}

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>('home')
  const [openError, setOpenError] = useState<string | null>(null)
  const [djEnv, setDjEnv] = useState<DetectedDjEnvironment | null>(null)
  const [scanningEnv, setScanningEnv] = useState(false)
  const [state, setState] = useState<AppState>({
    sourceFilePath: null,
    parseResult: null,
    selectedPlaylists: [],
    pendingExportConfig: null,
    spotifyMatchesByPlaylist: {},
    exportResults: []
  })

  const scanPc = async (): Promise<void> => {
    setScanningEnv(true)
    try {
      const env = await window.electronAPI.detectDjEnvironment()
      setDjEnv(env)
    } catch {
      // non-critical
    } finally {
      setScanningEnv(false)
    }
  }

  useEffect(() => {
    scanPc()
  }, [])

  const go = (s: Screen): void => {
    setOpenError(null)
    setScreen(s)
  }

  const applyParsedLibrary = (
    filePath: string,
    parseResult: ParseResult,
    targetScreen: Screen = 'playlists'
  ): void => {
    const autoSelect =
      parseResult.playlists.length <= 3
        ? parseResult.playlists
        : parseResult.playlists.slice(0, 1)
    setState((s) => ({
      ...s,
      sourceFilePath: filePath,
      parseResult,
      selectedPlaylists: autoSelect,
      spotifyMatchesByPlaylist: {},
      pendingExportConfig: null
    }))
    go(targetScreen)
  }

  const handleOpenDialog = async (targetScreen: Screen = 'playlists'): Promise<void> => {
    setOpenError(null)
    try {
      const result = await window.electronAPI.openAndParse()
      if (!result) return
      applyParsedLibrary(result.filePath, result.parseResult, targetScreen)
    } catch (err) {
      setOpenError((err as Error).message || 'Error desconocido al leer el archivo')
    }
  }

  const handleLoadPath = async (
    filePath: string,
    targetScreen: Screen = 'playlists'
  ): Promise<void> => {
    setOpenError(null)
    try {
      const result = await window.electronAPI.parsePath(filePath)
      applyParsedLibrary(result.filePath, result.parseResult, targetScreen)
    } catch (err) {
      setOpenError((err as Error).message || 'Error al procesar el archivo seleccionado')
    }
  }

  const handleLoadSeratoCrates = async (cratePaths: string[]): Promise<void> => {
    setOpenError(null)
    try {
      const result = await window.electronAPI.parseSeratoCrates(cratePaths)
      applyParsedLibrary(result.filePath, result.parseResult, 'playlists')
    } catch (err) {
      setOpenError((err as Error).message || 'Error al leer los crates de Serato')
    }
  }

  const handleImportSpotifyUrl = async (urlOrId: string, stayInAutopilot = false): Promise<void> => {
    setOpenError(null)
    try {
      const result = await window.electronAPI.importSpotifyUrl(urlOrId)
      applyParsedLibrary(result.filePath, result.parseResult, stayInAutopilot ? 'autopilot' : 'playlists')
    } catch (err) {
      const msg = (err as Error).message || 'Error al importar la playlist pública de Spotify'
      if (!stayInAutopilot) setOpenError(msg)
      throw err
    }
  }

  const handleApplyDownloadedPaths = (
    playlistId: string,
    pathMap: Record<string, string>
  ): void => {
    setState((s) => {
      if (!s.parseResult) return s
      const patchPlaylist = (pl: Playlist): Playlist =>
        pl.id !== playlistId
          ? pl
          : {
              ...pl,
              tracks: pl.tracks.map((t) =>
                pathMap[t.internalId] ? { ...t, location: pathMap[t.internalId] } : t
              )
            }
      const nextAll = s.parseResult.playlists.map(patchPlaylist)
      const targetPl = nextAll.find((p) => p.id === playlistId)
      const nextSel = targetPl
        ? [targetPl, ...s.selectedPlaylists.filter((p) => p.id !== playlistId)]
        : s.selectedPlaylists.map(patchPlaylist)
      return {
        ...s,
        parseResult: { ...s.parseResult, playlists: nextAll },
        selectedPlaylists: nextSel
      }
    })
    go('export')
  }

  const recordHistory = async (results: ExportResult[]): Promise<void> => {
    const formats = new Set<string>()
    const spotifyUrls: string[] = []
    let outputDir: string | undefined
    let totalTracks = 0

    for (const r of results) {
      totalTracks += r.totalTracks
      if (r.m3uPath) {
        formats.add('M3U8')
        if (!outputDir) outputDir = r.m3uPath.replace(/[\\/][^\\/]*$/, '')
      }
      if (r.nmlPath) {
        formats.add('NML')
        if (!outputDir) outputDir = r.nmlPath.replace(/[\\/][^\\/]*$/, '')
      }
      if (r.spotifyTxtPath) {
        formats.add('TXT')
        if (!outputDir) outputDir = r.spotifyTxtPath.replace(/[\\/][^\\/]*$/, '')
      }
      if (r.rekordboxXmlPath) {
        formats.add('RB XML')
        if (!outputDir) outputDir = r.rekordboxXmlPath.replace(/[\\/][^\\/]*$/, '')
      }
      if (r.setlistTxtPath) {
        formats.add('Setlist')
        if (!outputDir) outputDir = r.setlistTxtPath.replace(/[\\/][^\\/]*$/, '')
      }
      if (r.cueSheetPath) {
        formats.add('CUE')
        if (!outputDir) outputDir = r.cueSheetPath.replace(/[\\/][^\\/]*$/, '')
      }
      if (r.prepSheetHtmlPath) {
        formats.add('HTML Prep')
        if (!outputDir) outputDir = r.prepSheetHtmlPath.replace(/[\\/][^\\/]*$/, '')
      }
      if (r.streamingCsvPath) {
        formats.add('Streaming CSV')
        if (!outputDir) outputDir = r.streamingCsvPath.replace(/[\\/][^\\/]*$/, '')
      }
      if (r.spotifyPlaylistUrl) {
        formats.add('Spotify')
        spotifyUrls.push(r.spotifyPlaylistUrl)
      }
    }

    try {
      await window.electronAPI.addHistory({
        exportedAt: new Date().toISOString(),
        sourceFile: state.sourceFilePath?.split(/[\\/]/).pop() ?? 'DJ Export',
        playlistCount: results.length,
        totalTracks,
        outputDir,
        formats: Array.from(formats),
        spotifyUrls
      })
    } catch {
      // non-critical
    }
  }

  const hasLibrary = Boolean(state.parseResult && state.parseResult.playlists.length > 0)
  const hasSelection = state.selectedPlaylists.length > 0

  return (
    <div className={styles.shell}>
      <div className={styles.body}>
        {/* Persistent Studio Sidebar — Every Feature Always 1 Click Away */}
        <aside className={styles.sidebar}>
          <div className={styles.brandBox}>
            <FzrEmblem size={34} />
            <div>
              <div className={styles.brandTitle}>
                FZR <span>BOOTH OS</span>
              </div>
              <div className={styles.brandSub}>v2.1.0 · DJ Hub Local</div>
            </div>
          </div>

          <div>
            <div className={styles.navSectionLabel}>Menú principal</div>
            <nav className={styles.navList}>
              <button
                className={`${styles.navItem} ${screen === 'home' ? styles.navItemActive : ''}`}
                onClick={() => go('home')}
              >
                <span
                  className={styles.navDot}
                  style={{
                    background: '#0095ff',
                    boxShadow: screen === 'home' ? '0 0 10px #0095ff' : 'none'
                  }}
                />
                <div className={styles.navText}>
                  <div className={styles.navLabelRow}>
                    <span className={styles.navLabel}>Inicio & Auto-Detectar</span>
                  </div>
                  <div className={styles.navDesc}>Rekordbox, Traktor, Serato, URL Spotify</div>
                </div>
              </button>

              <button
                className={`${styles.navItem} ${screen === 'playlists' ? styles.navItemActive : ''}`}
                disabled={!hasLibrary}
                onClick={() => go('playlists')}
                title={!hasLibrary ? 'Carga primero una librería o URL desde Inicio' : undefined}
              >
                <span
                  className={styles.navDot}
                  style={{
                    background: '#ff7a1a',
                    boxShadow: screen === 'playlists' ? '0 0 10px #ff7a1a' : 'none'
                  }}
                />
                <div className={styles.navText}>
                  <div className={styles.navLabelRow}>
                    <span className={styles.navLabel}>Playlists & Camelot</span>
                    {hasLibrary && (
                      <span className={styles.navBadge}>{state.parseResult!.playlists.length}</span>
                    )}
                  </div>
                  <div className={styles.navDesc}>Rueda Camelot, BPM, limpiar y reparar</div>
                </div>
              </button>

              <button
                className={`${styles.navItem} ${screen === 'export' ? styles.navItemActive : ''}`}
                disabled={!hasSelection}
                onClick={() => go('export')}
                title={!hasSelection ? 'Selecciona al menos 1 playlist para exportar' : undefined}
              >
                <span
                  className={styles.navDot}
                  style={{
                    background: '#1db954',
                    boxShadow: screen === 'export' ? '0 0 10px #1db954' : 'none'
                  }}
                />
                <div className={styles.navText}>
                  <div className={styles.navLabelRow}>
                    <span className={styles.navLabel}>Exportar a Cabina</span>
                    {hasSelection && (
                      <span className={styles.navBadge} style={{ color: '#46ee82' }}>
                        {state.selectedPlaylists.length}
                      </span>
                    )}
                  </div>
                  <div className={styles.navDesc}>Traktor NML, RB XML, Spotify, USB, HTML</div>
                </div>
              </button>

              <button
                className={`${styles.navItem} ${screen === 'autopilot' ? styles.navItemAutopilot : ''}`}
                onClick={() => go('autopilot')}
              >
                <span
                  className={styles.navDot}
                  style={{
                    background: '#00d4ff',
                    boxShadow: '0 0 10px #00d4ff'
                  }}
                />
                <div className={styles.navText}>
                  <div className={styles.navLabelRow}>
                    <span className={styles.navLabel}>Soulseek Autopilot</span>
                    <span
                      className={styles.navBadge}
                      style={{
                        background: 'rgba(0, 212, 255, 0.16)',
                        color: '#5ce1ff'
                      }}
                    >
                      PRO
                    </span>
                  </div>
                  <div className={styles.navDesc}>FLAC / Hi-Res / 320 · Anti-Ban · Dry-Run</div>
                </div>
              </button>

              {state.pendingExportConfig && (
                <button
                  className={`${styles.navItem} ${screen === 'review' ? styles.navItemActive : ''}`}
                  onClick={() => go('review')}
                >
                  <span className={styles.navDot} style={{ background: '#1db954' }} />
                  <div className={styles.navText}>
                    <div className={styles.navLabel}>Revisión Spotify</div>
                    <div className={styles.navDesc}>Confirmar matches antes de crear</div>
                  </div>
                </button>
              )}

              {state.exportResults.length > 0 && (
                <button
                  className={`${styles.navItem} ${screen === 'results' ? styles.navItemActive : ''}`}
                  onClick={() => go('results')}
                >
                  <span className={styles.navDot} style={{ background: '#46ee82' }} />
                  <div className={styles.navText}>
                    <div className={styles.navLabel}>Último resultado</div>
                    <div className={styles.navDesc}>Abrir archivos e informes</div>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Active library card & quick open */}
          <div className={styles.sidebarFooter}>
            {state.parseResult ? (
              <div className={styles.loadedCard}>
                <div className={styles.loadedLabel}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#1db954',
                      boxShadow: '0 0 8px #1db954'
                    }}
                  />
                  Librería activa
                </div>
                <div className={styles.loadedName}>
                  {state.sourceFilePath?.split(/[\\/]/).pop() ?? 'Librería DJ'}
                </div>
                <div className={styles.loadedMeta}>
                  {state.parseResult.playlists.length} playlist(s) ·{' '}
                  {state.parseResult.tracks.length.toLocaleString()} tracks
                </div>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: '5px 8px', marginTop: 4 }}
                  onClick={() => handleOpenDialog('playlists')}
                >
                  Cargar otro archivo...
                </button>
              </div>
            ) : (
              <button
                className="btn-primary"
                style={{ width: '100%', fontSize: 12.5, padding: '9px 12px' }}
                onClick={() => handleOpenDialog('playlists')}
              >
                + Cargar librería DJ
              </button>
            )}
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className={styles.workspace}>
          {screen === 'home' && (
            <HomeScreen
              djEnv={djEnv}
              scanningEnv={scanningEnv}
              onRescanPc={scanPc}
              onOpenFile={() => handleOpenDialog('playlists')}
              onDropFile={(fp) => handleLoadPath(fp, 'playlists')}
              onLoadDetectedFile={(fp) => handleLoadPath(fp, 'playlists')}
              onLoadSeratoCrates={handleLoadSeratoCrates}
              onImportSpotifyUrl={(url) => handleImportSpotifyUrl(url, false)}
              onOpenAutopilot={() => go('autopilot')}
              onOpenPlaylists={hasLibrary ? () => go('playlists') : () => handleOpenDialog('playlists')}
              errorMessage={openError}
              onClearError={() => setOpenError(null)}
            />
          )}

          {screen === 'playlists' && state.parseResult && (
            <PlaylistsScreen
              playlists={state.parseResult.playlists}
              selectedPlaylists={state.selectedPlaylists}
              onPlaylistsMutated={(updatedAll, updatedSelected) =>
                setState((s) => ({
                  ...s,
                  parseResult: s.parseResult
                    ? { ...s.parseResult, playlists: updatedAll }
                    : s.parseResult,
                  selectedPlaylists: updatedSelected
                }))
              }
              onSelectionChange={(sel) => setState((s) => ({ ...s, selectedPlaylists: sel }))}
              onOpenAutopilot={() => go('autopilot')}
              onContinue={() => go('export')}
              onBack={() => go('home')}
            />
          )}

          {screen === 'export' && (
            <ExportScreen
              selectedPlaylists={state.selectedPlaylists}
              onReviewSpotify={(matchesByPlaylist, config) => {
                setState((s) => ({
                  ...s,
                  spotifyMatchesByPlaylist: matchesByPlaylist,
                  pendingExportConfig: config
                }))
                go('review')
              }}
              onExportDone={async (results) => {
                await recordHistory(results)
                setState((s) => ({ ...s, exportResults: results }))
                go('results')
              }}
              onBack={() => go('playlists')}
            />
          )}

          {screen === 'review' && state.pendingExportConfig && (
            <ReviewScreen
              playlists={state.selectedPlaylists}
              initialMatchesByPlaylist={state.spotifyMatchesByPlaylist}
              exportConfig={state.pendingExportConfig}
              onBack={() => go('export')}
              onExportDone={async (results) => {
                await recordHistory(results)
                setState((s) => ({ ...s, exportResults: results }))
                go('results')
              }}
            />
          )}

          {screen === 'results' && (
            <ResultsScreen
              exportResults={state.exportResults}
              onBack={() => go('home')}
            />
          )}

          {screen === 'autopilot' && (
            <AutopilotScreen
              playlists={
                state.selectedPlaylists.length > 0
                  ? state.selectedPlaylists
                  : state.parseResult?.playlists ?? []
              }
              onBack={() => go(state.parseResult ? 'playlists' : 'home')}
              onLoadFile={() => handleOpenDialog('autopilot')}
              onImportSpotifyUrl={(url) => handleImportSpotifyUrl(url, true)}
              onApplyDownloadedPaths={handleApplyDownloadedPaths}
            />
          )}
        </div>
      </div>

      {/* Persistent Studio Status Footer */}
      <div className={styles.statusBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#46ee82', fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1db954', boxShadow: '0 0 8px #1db954' }} />
            FZR BOOTH OS READY
          </span>
          {djEnv && (
            <span style={{ color: 'var(--text-muted)' }}>
              · Detectado:{' '}
              {[
                djEnv.rekordbox.installed && 'Rekordbox',
                djEnv.traktor.installed && 'Traktor',
                djEnv.serato.installed && 'Serato',
                djEnv.virtualdj.installed && 'VirtualDJ',
                'Soulseek Nativo'
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </div>

        <MiniRgbWaveform bars={22} height={12} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span>100% LOCAL · ZERO UPLOAD</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>v2.1.0</span>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import type {
  ParseResult,
  Playlist,
  ExportResult,
  SpotifyMatch
} from '../../core/common/types'
import HomeScreen from './screens/HomeScreen'
import ImportScreen from './screens/ImportScreen'
import PlaylistsScreen from './screens/PlaylistsScreen'
import ExportScreen, { type PendingExportConfig } from './screens/ExportScreen'
import ReviewScreen from './screens/ReviewScreen'
import ResultsScreen from './screens/ResultsScreen'

export type Screen =
  | 'home'
  | 'import'
  | 'playlists'
  | 'export'
  | 'review'
  | 'results'

export type AppState = {
  sourceFilePath: string | null
  parseResult: ParseResult | null
  selectedPlaylists: Playlist[]
  pendingExportConfig: PendingExportConfig | null
  spotifyMatchesByPlaylist: Record<string, SpotifyMatch[]>
  exportResults: ExportResult[]
}

const STEP_LABELS: Array<{ id: Screen; label: string }> = [
  { id: 'import', label: '1. Archivo' },
  { id: 'playlists', label: '2. Playlists' },
  { id: 'export', label: '3. Opciones' },
  { id: 'review', label: '4. Revisión Spotify' },
  { id: 'results', label: '5. Resultados' }
]

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>('home')
  const [openError, setOpenError] = useState<string | null>(null)
  const [state, setState] = useState<AppState>({
    sourceFilePath: null,
    parseResult: null,
    selectedPlaylists: [],
    pendingExportConfig: null,
    spotifyMatchesByPlaylist: {},
    exportResults: []
  })

  const go = (s: Screen): void => {
    setOpenError(null)
    setScreen(s)
  }

  const handleOpenDialog = async (): Promise<void> => {
    setOpenError(null)
    try {
      const result = await window.electronAPI.openAndParse()
      if (!result) return
      setState((s) => ({
        ...s,
        sourceFilePath: result.filePath,
        parseResult: result.parseResult,
        selectedPlaylists:
          result.parseResult.playlists.length === 1 ? result.parseResult.playlists : [],
        spotifyMatchesByPlaylist: {},
        pendingExportConfig: null
      }))
      go('import')
    } catch (err) {
      setOpenError((err as Error).message || 'Error desconocido al leer el archivo')
    }
  }

  const handleDropPath = async (filePath: string): Promise<void> => {
    setOpenError(null)
    try {
      const result = await window.electronAPI.parsePath(filePath)
      setState((s) => ({
        ...s,
        sourceFilePath: result.filePath,
        parseResult: result.parseResult,
        selectedPlaylists:
          result.parseResult.playlists.length === 1 ? result.parseResult.playlists : [],
        spotifyMatchesByPlaylist: {},
        pendingExportConfig: null
      }))
      go('import')
    } catch (err) {
      setOpenError((err as Error).message || 'Error al procesar el archivo arrastrado')
    }
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
        sourceFile: state.sourceFilePath?.split(/[\\/]/).pop() ?? 'Rekordbox',
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

  const currentStepIdx = STEP_LABELS.findIndex((s) => s.id === screen)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {screen !== 'home' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '8px 16px',
            background: '#0d0f14',
            borderBottom: '1px solid var(--border)',
            fontSize: 11
          }}
        >
          {STEP_LABELS.map((step, idx) => {
            const isActive = step.id === screen
            const isDone = idx < currentStepIdx
            return (
              <React.Fragment key={step.id}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 99,
                    fontWeight: isActive ? 700 : 500,
                    background: isActive
                      ? 'rgba(244, 125, 32, 0.16)'
                      : isDone
                        ? 'rgba(29, 185, 84, 0.12)'
                        : 'transparent',
                    color: isActive
                      ? 'var(--accent)'
                      : isDone
                        ? 'var(--green)'
                        : 'var(--text-muted)',
                    border: isActive
                      ? '1px solid rgba(244, 125, 32, 0.4)'
                      : '1px solid transparent'
                  }}
                >
                  {isDone ? '✓ ' : ''}
                  {step.label}
                </span>
                {idx < STEP_LABELS.length - 1 && (
                  <span style={{ color: 'var(--border)' }}>›</span>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {screen === 'home' && (
          <HomeScreen
            onOpenFile={handleOpenDialog}
            onDropFile={handleDropPath}
            errorMessage={openError}
            onClearError={() => setOpenError(null)}
          />
        )}
        {screen === 'import' && state.parseResult && (
          <ImportScreen
            filePath={state.sourceFilePath!}
            parseResult={state.parseResult}
            onContinue={() => go('playlists')}
            onBack={() => go('home')}
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
            onContinue={() => go('export')}
            onBack={() => go('import')}
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
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import type {
  ParseResult,
  Playlist,
  ExportResult,
  SpotifyMatch
} from '../../core/common/types'
import { FzrEmblem, MiniRgbWaveform } from './components/StudioIcons'
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

const STEP_LABELS: Array<{ id: Screen; num: string; label: string }> = [
  { id: 'import', num: '01', label: 'Archivo' },
  { id: 'playlists', num: '02', label: 'Playlists' },
  { id: 'export', num: '03', label: 'Exportar' },
  { id: 'review', num: '04', label: 'Revisión' },
  { id: 'results', num: '05', label: 'Listo' }
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

  const currentStepIdx = STEP_LABELS.findIndex((s) => s.id === screen)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Unified FZR Booth Top Bar when inside workflow */}
      {screen !== 'home' && (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 20px',
            background: 'rgba(11, 14, 22, 0.94)',
            borderBottom: '1px solid var(--border)',
            backdropFilter: 'blur(16px)'
          }}
        >
          {/* Left: Brand emblem */}
          <button
            onClick={() => go('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--text)'
            }}
            title="Volver al inicio"
          >
            <FzrEmblem size={26} />
            <span style={{ fontWeight: 800, letterSpacing: '0.4px', fontSize: 13 }}>
              FZR <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>DECK</span>
            </span>
          </button>

          {/* Center: Hardware Transport Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            {STEP_LABELS.map((step, idx) => {
              const isActive = step.id === screen
              const isDone = idx < currentStepIdx
              return (
                <React.Fragment key={step.id}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 11px',
                      borderRadius: 999,
                      fontWeight: isActive ? 700 : 500,
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(0,149,255,0.18), rgba(29,185,84,0.18))'
                        : isDone
                          ? 'rgba(29, 185, 84, 0.1)'
                          : 'rgba(255,255,255,0.02)',
                      color: isActive
                        ? '#ffffff'
                        : isDone
                          ? '#46ee82'
                          : 'var(--text-muted)',
                      border: isActive
                        ? '1px solid rgba(0, 149, 255, 0.45)'
                        : isDone
                          ? '1px solid rgba(29, 185, 84, 0.25)'
                          : '1px solid transparent'
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', opacity: 0.75, fontSize: 10 }}>
                      {isDone ? '✓' : step.num}
                    </span>
                    {step.label}
                  </span>
                  {idx < STEP_LABELS.length - 1 && (
                    <span style={{ color: 'rgba(255,255,255,0.18)' }}>›</span>
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Right: Tri-platform LED indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rb-blue)', boxShadow: '0 0 8px var(--rb-blue)' }} />
            <span>RB</span>
            <span style={{ opacity: 0.35 }}>⇄</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--tr-amber)', boxShadow: '0 0 8px var(--tr-amber)' }} />
            <span>TR</span>
            <span style={{ opacity: 0.35 }}>→</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sp-green)', boxShadow: '0 0 8px var(--sp-green)' }} />
            <span>SP</span>
          </div>

          {/* Tri-gradient hairline seam */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 1.5,
              background:
                'linear-gradient(90deg, transparent 0%, #0095ff 25%, #e8edf7 50%, #ff7a1a 68%, #1db954 88%, transparent 100%)',
              opacity: 0.55
            }}
          />
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

      {/* Persistent Traktor/Rekordbox Hardware Footer Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '6px 18px',
          background: '#080a10',
          borderTop: '1px solid var(--border)',
          fontFamily: 'monospace',
          fontSize: 10.5,
          color: 'var(--text-muted)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#46ee82', fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1db954', boxShadow: '0 0 8px #1db954' }} />
            ENGINE READY
          </span>
          {state.sourceFilePath && (
            <span style={{ color: '#8cd0ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
              · {state.sourceFilePath.split(/[\\/]/).pop()}
              {state.parseResult ? ` (${state.parseResult.tracks.length} tracks · ${state.parseResult.playlists.length} pl)` : ''}
            </span>
          )}
        </div>

        <MiniRgbWaveform bars={22} height={12} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span>100% LOCAL · ZERO UPLOAD</span>
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>v1.5.0</span>
        </div>
      </div>
    </div>
  )
}

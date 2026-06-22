import React, { useState } from 'react'
import type { ParseResult, Playlist, ExportResult } from '../../core/common/types'
import HomeScreen from './screens/HomeScreen'
import ImportScreen from './screens/ImportScreen'
import PlaylistsScreen from './screens/PlaylistsScreen'
import ExportScreen from './screens/ExportScreen'
import ResultsScreen from './screens/ResultsScreen'

export type Screen =
  | 'home'
  | 'import'
  | 'playlists'
  | 'export'
  | 'results'

export type AppState = {
  sourceFilePath: string | null
  parseResult: ParseResult | null
  selectedPlaylists: Playlist[]
  exportResults: ExportResult[]
}

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>('home')
  const [state, setState] = useState<AppState>({
    sourceFilePath: null,
    parseResult: null,
    selectedPlaylists: [],
    exportResults: []
  })

  const go = (s: Screen): void => setScreen(s)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {screen === 'home' && (
        <HomeScreen
          onOpenFile={async () => {
            const result = await window.electronAPI.openAndParse()
            if (!result) return
            try {
              setState((s) => ({
                ...s,
                sourceFilePath: result.filePath,
                parseResult: result.parseResult,
                selectedPlaylists: []
              }))
              go('import')
            } catch (err) {
              alert(`Error al procesar el archivo: ${(err as Error).message}`)
            }
          }}
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
          onSelectionChange={(sel) => setState((s) => ({ ...s, selectedPlaylists: sel }))}
          onContinue={() => go('export')}
          onBack={() => go('import')}
        />
      )}
      {screen === 'export' && (
        <ExportScreen
          selectedPlaylists={state.selectedPlaylists}
          onExportDone={(results) => {
            setState((s) => ({ ...s, exportResults: results }))
            go('results')
          }}
          onBack={() => go('playlists')}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen
          exportResults={state.exportResults}
          onBack={() => go('home')}
        />
      )}
    </div>
  )
}

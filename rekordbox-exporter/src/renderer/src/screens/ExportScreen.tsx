import React, { useState, useEffect, useRef } from 'react'
import type { Playlist, ExportResult } from '../../../core/common/types'
import type { SpotifyProgressEvent } from '../../../preload/index'
import styles from './ExportScreen.module.css'

type Props = {
  selectedPlaylists: Playlist[]
  onExportDone: (results: ExportResult[]) => void
  onBack: () => void
}

type SpotifyProgress = {
  playlistName: string
  stage: SpotifyProgressEvent['stage']
  current: number
  total: number
  matched: number
  notFound: number
}

export default function ExportScreen({ selectedPlaylists, onExportDone, onBack }: Props): JSX.Element {
  const [exportM3U8, setExportM3U8] = useState(true)
  const [exportNml, setExportNml] = useState(true)
  const [exportSpotifyTxt, setExportSpotifyTxt] = useState(false)
  const [exportSpotifyApi, setExportSpotifyApi] = useState(false)
  const [outputDir, setOutputDir] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Spotify state
  const [spotifyClientId, setSpotifyClientId] = useState('')
  const [spotifyLoggedIn, setSpotifyLoggedIn] = useState(false)
  const [spotifyDisplayName, setSpotifyDisplayName] = useState<string | null>(null)
  const [spotifyLoggingIn, setSpotifyLoggingIn] = useState(false)
  const [spotifyLoginError, setSpotifyLoginError] = useState<string | null>(null)
  const [spotifyProgress, setSpotifyProgress] = useState<SpotifyProgress | null>(null)

  const progressUnsubRef = useRef<(() => void) | null>(null)

  const totalTracks = selectedPlaylists.reduce((acc, p) => acc + p.tracks.length, 0)

  // Load saved clientId + session status on mount
  useEffect(() => {
    window.electronAPI.spotifyGetClientId().then((id) => {
      if (id) setSpotifyClientId(id)
    })
    window.electronAPI.spotifyGetStatus().then((status) => {
      setSpotifyLoggedIn(status.loggedIn)
      setSpotifyDisplayName(status.displayName)
    })
  }, [])

  const handleChooseDir = async (): Promise<void> => {
    const dir = await window.electronAPI.openOutputDir()
    if (dir) setOutputDir(dir)
  }

  const handleSpotifyLogin = async (): Promise<void> => {
    if (!spotifyClientId.trim()) {
      setSpotifyLoginError('Introduce tu Spotify Client ID')
      return
    }
    setSpotifyLoggingIn(true)
    setSpotifyLoginError(null)
    try {
      await window.electronAPI.spotifySetClientId(spotifyClientId.trim())
      const result = await window.electronAPI.spotifyLogin(spotifyClientId.trim())
      setSpotifyLoggedIn(true)
      setSpotifyDisplayName(result.displayName)
    } catch (err) {
      setSpotifyLoginError((err as Error).message)
    } finally {
      setSpotifyLoggingIn(false)
    }
  }

  const handleSpotifyLogout = async (): Promise<void> => {
    await window.electronAPI.spotifyLogout()
    setSpotifyLoggedIn(false)
    setSpotifyDisplayName(null)
  }

  const handleExport = async (): Promise<void> => {
    if (!canExport) return
    setExporting(true)
    setError(null)
    setSpotifyProgress(null)

    // Subscribe to Spotify progress events
    if (exportSpotifyApi) {
      progressUnsubRef.current = window.electronAPI.onSpotifyProgress((data) => {
        setSpotifyProgress(data)
      })
    }

    try {
      // Step 1: Traktor + TXT export (needs outputDir)
      let baseResults: ExportResult[] = []
      if (needsFolder) {
        baseResults = await window.electronAPI.exportPlaylists(selectedPlaylists, {
          outputDir: outputDir!,
          exportM3U8,
          exportNml,
          exportSpotifyTxt
        })
      } else {
        // Only Spotify API export — fabricate minimal base results
        baseResults = selectedPlaylists.map((p) => ({
          playlistName: p.name,
          totalTracks: p.tracks.length,
          matchedTracks: 0,
          ambiguousTracks: 0,
          notFoundTracks: 0,
          exportedAt: new Date().toISOString()
        }))
      }

      // Step 2: Spotify API export (per playlist)
      const finalResults: ExportResult[] = [...baseResults]
      if (exportSpotifyApi) {
        for (let i = 0; i < selectedPlaylists.length; i++) {
          const playlist = selectedPlaylists[i]
          const spotifyResult = await window.electronAPI.spotifyExportPlaylist(playlist)
          finalResults[i] = {
            ...finalResults[i],
            spotifyPlaylistUrl: spotifyResult.playlistUrl,
            spotifyMatched: spotifyResult.matched,
            spotifyNotFound: spotifyResult.notFound
          }
        }
      }

      onExportDone(finalResults)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setExporting(false)
      if (progressUnsubRef.current) {
        progressUnsubRef.current()
        progressUnsubRef.current = null
      }
    }
  }

  const needsFolder = exportM3U8 || exportNml || exportSpotifyTxt
  const canExport =
    !exporting &&
    (exportM3U8 || exportNml || exportSpotifyTxt || exportSpotifyApi) &&
    (!needsFolder || outputDir !== null) &&
    (!exportSpotifyApi || spotifyLoggedIn)

  const spotifyProgressPct =
    spotifyProgress && spotifyProgress.total > 0
      ? Math.round((spotifyProgress.current / spotifyProgress.total) * 100)
      : 0

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className="btn-ghost" onClick={onBack} disabled={exporting}>← Atrás</button>
        <h2>Opciones de exportación</h2>
        <span />
      </header>

      <div className={styles.content}>
        <div className={styles.summary}>
          <strong>{selectedPlaylists.length}</strong> playlists seleccionadas ·{' '}
          <strong>{totalTracks.toLocaleString()}</strong> tracks en total
        </div>

        {/* Traktor section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Traktor / DJ</h3>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={exportM3U8}
              onChange={(e) => setExportM3U8(e.target.checked)}
              disabled={exporting}
            />
            <div>
              <div className={styles.optionLabel}>Exportar M3U8</div>
              <div className={styles.optionDesc}>
                Playlist .m3u8 compatible con Traktor, VirtualDJ y cualquier reproductor DJ
              </div>
            </div>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={exportNml}
              onChange={(e) => setExportNml(e.target.checked)}
              disabled={exporting}
            />
            <div>
              <div className={styles.optionLabel}>Exportar NML para Traktor</div>
              <div className={styles.optionDesc}>
                Archivo .nml importable en Traktor Pro. Experimental — revisa el resultado en Traktor.
              </div>
            </div>
          </label>
        </section>

        {/* Spotify section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Spotify</h3>

          <label className={styles.option}>
            <input
              type="checkbox"
              checked={exportSpotifyTxt}
              onChange={(e) => setExportSpotifyTxt(e.target.checked)}
              disabled={exporting}
            />
            <div>
              <div className={styles.optionLabel}>Exportar lista para Spotify (.txt)</div>
              <div className={styles.optionDesc}>
                Genera un archivo de texto con "Artista - Título" por línea. Importa en{' '}
                <strong>Soundiiz</strong>, <strong>TuneMyMusic</strong> o <strong>Exportify</strong>{' '}
                para crear la playlist en Spotify sin necesidad de cuenta de desarrollador.
              </div>
            </div>
          </label>

          <label className={styles.option}>
            <input
              type="checkbox"
              checked={exportSpotifyApi}
              onChange={(e) => setExportSpotifyApi(e.target.checked)}
              disabled={exporting}
            />
            <div>
              <div className={styles.optionLabel}>Crear playlist directamente en Spotify</div>
              <div className={styles.optionDesc}>
                Busca cada canción en Spotify y crea la playlist en tu cuenta. Requiere un Spotify
                Developer Client ID (gratuito).
              </div>
            </div>
          </label>

          {exportSpotifyApi && (
            <div style={{ marginTop: 12, padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              {!spotifyLoggedIn ? (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Necesitas un <strong>Client ID</strong> de Spotify Developer.{' '}
                    <span
                      style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => window.open('https://developer.spotify.com/dashboard', '_blank')}
                    >
                      Crear app gratuita →
                    </span>
                    <br />
                    En la app de Spotify Developer, añade <code style={{ background: '#1a1a2e', padding: '1px 5px', borderRadius: 3 }}>http://127.0.0.1:7823/callback</code> como Redirect URI.
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Spotify Client ID"
                      value={spotifyClientId}
                      onChange={(e) => setSpotifyClientId(e.target.value)}
                      disabled={spotifyLoggingIn || exporting}
                      style={{
                        flex: 1,
                        background: 'var(--bg3)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text)',
                        padding: '8px 12px',
                        fontSize: 13,
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      className="btn-secondary"
                      onClick={handleSpotifyLogin}
                      disabled={spotifyLoggingIn || exporting}
                    >
                      {spotifyLoggingIn ? 'Esperando...' : 'Iniciar sesión'}
                    </button>
                  </div>
                  {spotifyLoginError && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#f99' }}>{spotifyLoginError}</div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13 }}>
                    <span style={{ color: '#1db954', marginRight: 6 }}>✓</span>
                    Conectado como <strong>{spotifyDisplayName}</strong>
                  </span>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={handleSpotifyLogout}
                    disabled={exporting}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Output folder */}
        {needsFolder && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Carpeta de destino</h3>
            <div className={styles.dirRow}>
              <div className={styles.dirPath}>
                {outputDir ?? <span className={styles.dimText}>Sin seleccionar</span>}
              </div>
              <button className="btn-secondary" onClick={handleChooseDir} disabled={exporting}>
                Elegir carpeta
              </button>
            </div>
            {outputDir && (
              <div className={styles.dirHint}>
                Se crearán subcarpetas por playlist dentro de esta carpeta
              </div>
            )}
          </section>
        )}

        {/* Spotify progress */}
        {exporting && exportSpotifyApi && spotifyProgress && (
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '14px 18px'
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Spotify — <strong>{spotifyProgress.playlistName}</strong>:{' '}
              {spotifyProgress.stage === 'creating' && 'Creando playlist...'}
              {spotifyProgress.stage === 'searching' && `Buscando canción ${spotifyProgress.current}/${spotifyProgress.total}...`}
              {spotifyProgress.stage === 'adding' && 'Añadiendo canciones...'}
              {spotifyProgress.stage === 'done' && `✓ ${spotifyProgress.matched} encontradas · ${spotifyProgress.notFound} no encontradas`}
            </div>
            {spotifyProgress.stage !== 'done' && (
              <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${spotifyProgressPct}%`,
                  background: '#1db954',
                  transition: 'width 0.2s ease'
                }} />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className={styles.errorBox}>
            <strong>Error durante la exportación:</strong> {error}
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={!canExport}
          style={{ minWidth: 160 }}
        >
          {exporting ? 'Exportando...' : 'Exportar ahora'}
        </button>
      </footer>
    </div>
  )
}


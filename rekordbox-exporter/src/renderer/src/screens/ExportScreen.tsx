import React, { useState, useEffect, useRef } from 'react'
import type { Playlist, ExportResult, SpotifyMatch } from '../../../core/common/types'
import type { SpotifyProgressEvent } from '../../../preload/index'
import styles from './ExportScreen.module.css'

export type PendingExportConfig = {
  outputDir: string | null
  exportM3U8: boolean
  exportNml: boolean
  exportRekordboxXml: boolean
  exportSetlist: boolean
  exportCueSheet: boolean
  exportPrepSheetHtml: boolean
  exportStreamingCsv: boolean
  exportSpotifyTxt: boolean
  exportSpotifyApi: boolean
  playlistNamePrefix: string
  preserveFolders: boolean
  relativeM3uPaths: boolean
  copyAudioFiles: boolean
  spotifyPublic: boolean
}

type Props = {
  selectedPlaylists: Playlist[]
  onReviewSpotify: (
    matchesByPlaylist: Record<string, SpotifyMatch[]>,
    config: PendingExportConfig
  ) => void
  onExportDone: (results: ExportResult[]) => void
  onBack: () => void
}

export default function ExportScreen({
  selectedPlaylists,
  onReviewSpotify,
  onExportDone,
  onBack
}: Props): JSX.Element {
  const [exportM3U8, setExportM3U8] = useState(true)
  const [exportNml, setExportNml] = useState(true)
  const [exportRekordboxXml, setExportRekordboxXml] = useState(false)
  const [exportSetlist, setExportSetlist] = useState(false)
  const [exportCueSheet, setExportCueSheet] = useState(false)
  const [exportPrepSheetHtml, setExportPrepSheetHtml] = useState(false)
  const [exportStreamingCsv, setExportStreamingCsv] = useState(false)
  const [playlistNamePrefix, setPlaylistNamePrefix] = useState('')
  const [preserveFolders, setPreserveFolders] = useState(true)
  const [relativeM3uPaths, setRelativeM3uPaths] = useState(false)
  const [copyAudioFiles, setCopyAudioFiles] = useState(false)
  const [exportSpotifyTxt, setExportSpotifyTxt] = useState(false)
  const [exportSpotifyApi, setExportSpotifyApi] = useState(false)
  const [reviewBeforeCreate, setReviewBeforeCreate] = useState(true)
  const [spotifyPublic, setSpotifyPublic] = useState(false)

  const [outputDir, setOutputDir] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Spotify state
  const [spotifyClientId, setSpotifyClientId] = useState('')
  const [spotifyLoggedIn, setSpotifyLoggedIn] = useState(false)
  const [spotifyDisplayName, setSpotifyDisplayName] = useState<string | null>(null)
  const [spotifyLoggingIn, setSpotifyLoggingIn] = useState(false)
  const [spotifyLoginError, setSpotifyLoginError] = useState<string | null>(null)
  const [spotifyProgress, setSpotifyProgress] = useState<SpotifyProgressEvent | null>(null)

  const progressUnsubRef = useRef<(() => void) | null>(null)

  const totalTracks = selectedPlaylists.reduce((acc, p) => acc + p.tracks.length, 0)

  useEffect(() => {
    window.electronAPI.spotifyGetClientId().then((id) => {
      if (id) setSpotifyClientId(id)
    })
    window.electronAPI.spotifyGetStatus().then((status) => {
      setSpotifyLoggedIn(status.loggedIn)
      setSpotifyDisplayName(status.displayName)
    })
    return () => {
      progressUnsubRef.current?.()
    }
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

  const handleCancelLogin = async (): Promise<void> => {
    await window.electronAPI.spotifyCancelLogin()
    setSpotifyLoggingIn(false)
  }

  const handleSpotifyLogout = async (): Promise<void> => {
    await window.electronAPI.spotifyLogout()
    setSpotifyLoggedIn(false)
    setSpotifyDisplayName(null)
  }

  const handleCancelExport = async (): Promise<void> => {
    await window.electronAPI.spotifyCancelOperation()
  }

  const needsFolder =
    exportM3U8 ||
    exportNml ||
    exportRekordboxXml ||
    exportSetlist ||
    exportCueSheet ||
    exportPrepSheetHtml ||
    exportStreamingCsv ||
    exportSpotifyTxt
  const canExport =
    !exporting &&
    (needsFolder || exportSpotifyApi) &&
    (!needsFolder || outputDir !== null) &&
    (!exportSpotifyApi || spotifyLoggedIn)

  const handleExport = async (): Promise<void> => {
    if (!canExport) return
    setExporting(true)
    setError(null)
    setSpotifyProgress(null)

    if (exportSpotifyApi) {
      progressUnsubRef.current = window.electronAPI.onSpotifyProgress((data) => {
        setSpotifyProgress(data)
      })
    }

    try {
      // Mode A: Spotify API + Manual Review before creating playlists
      if (exportSpotifyApi && reviewBeforeCreate) {
        const matchesByPlaylist: Record<string, SpotifyMatch[]> = {}
        for (const playlist of selectedPlaylists) {
          matchesByPlaylist[playlist.id] = await window.electronAPI.spotifyMatchPlaylist(playlist)
        }
        onReviewSpotify(matchesByPlaylist, {
          outputDir,
          exportM3U8,
          exportNml,
          exportRekordboxXml,
          exportSetlist,
          exportCueSheet,
          exportPrepSheetHtml,
          exportStreamingCsv,
          exportSpotifyTxt,
          exportSpotifyApi,
          playlistNamePrefix: playlistNamePrefix.trim(),
          preserveFolders,
          relativeM3uPaths,
          copyAudioFiles,
          spotifyPublic
        })
        return
      }

      // Mode B: Direct export (no Spotify review screen)
      const spotifyMatchesByPlaylist: Record<string, SpotifyMatch[]> = {}
      const spotifyUrlsByPlaylist: Record<string, string> = {}
      const spotifyResultsByPlaylist: Record<
        string,
        {
          playlistUrl: string
          matched: number
          notFound: number
          unmatchedTracks: Array<{ artist: string; name: string }>
        }
      > = {}

      if (exportSpotifyApi) {
        const prefix = playlistNamePrefix.trim()
        for (const playlist of selectedPlaylists) {
          const matches = await window.electronAPI.spotifyMatchPlaylist(playlist)
          spotifyMatchesByPlaylist[playlist.id] = matches
          const targetName = prefix ? `${prefix} ${playlist.name}` : playlist.name
          const spRes = await window.electronAPI.spotifyCreatePlaylist(targetName, matches, {
            isPublic: spotifyPublic
          })
          spotifyUrlsByPlaylist[playlist.id] = spRes.playlistUrl
          spotifyResultsByPlaylist[playlist.id] = spRes
        }
      }

      let finalResults: ExportResult[] = []
      if (needsFolder) {
        finalResults = await window.electronAPI.exportPlaylists(selectedPlaylists, {
          outputDir: outputDir!,
          exportM3U8,
          exportNml,
          exportRekordboxXml,
          exportSetlist,
          exportCueSheet,
          exportPrepSheetHtml,
          exportStreamingCsv,
          exportSpotifyTxt,
          playlistNamePrefix: playlistNamePrefix.trim() || undefined,
          preserveFolders,
          relativeM3uPaths,
          copyAudioFiles,
          spotifyMatchesByPlaylist: exportSpotifyApi ? spotifyMatchesByPlaylist : undefined,
          spotifyUrlsByPlaylist: exportSpotifyApi ? spotifyUrlsByPlaylist : undefined
        })
      } else {
        finalResults = selectedPlaylists.map((p) => ({
          playlistName: p.name,
          totalTracks: p.tracks.length,
          matchedTracks: 0,
          ambiguousTracks: 0,
          notFoundTracks: 0,
          exportedAt: new Date().toISOString()
        }))
      }

      if (exportSpotifyApi) {
        finalResults = finalResults.map((res, idx) => {
          const sp = spotifyResultsByPlaylist[selectedPlaylists[idx].id]
          if (!sp) return res
          return {
            ...res,
            spotifyPlaylistUrl: sp.playlistUrl,
            spotifyPublic,
            spotifyMatched: sp.matched,
            spotifyNotFound: sp.notFound,
            spotifyUnmatchedTracks: sp.unmatchedTracks
          }
        })
      }

      onExportDone(finalResults)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setExporting(false)
      progressUnsubRef.current?.()
      progressUnsubRef.current = null
    }
  }

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
          <strong>{selectedPlaylists.length}</strong> playlist{selectedPlaylists.length !== 1 ? 's' : ''} seleccionada{selectedPlaylists.length !== 1 ? 's' : ''} ·{' '}
          <strong>{totalTracks.toLocaleString()}</strong> tracks en total
        </div>

        {/* Traktor / DJ section */}
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
                Playlist UTF-8 (.m3u8) compatible con Traktor, VirtualDJ, Serato y cualquier reproductor DJ
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
              <div className={styles.optionLabel}>Exportar NML v19 para Traktor Pro</div>
              <div className={styles.optionDesc}>
                Archivo .nml independiente con BPM, tonalidad Open Key, cue points y rutas Traktor. Nunca modifica tu collection.nml.
              </div>
            </div>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={exportRekordboxXml}
              onChange={(e) => setExportRekordboxXml(e.target.checked)}
              disabled={exporting}
            />
            <div>
              <div className={styles.optionLabel}>Exportar Rekordbox XML (Bidireccional)</div>
              <div className={styles.optionDesc}>
                Genera un archivo DJ_PLAYLISTS .xml listo para importar en Rekordbox (ideal tras importar desde Traktor .nml, ordenar armónicamente o reparar rutas).
              </div>
            </div>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={exportSetlist}
              onChange={(e) => setExportSetlist(e.target.checked)}
              disabled={exporting}
            />
            <div>
              <div className={styles.optionLabel}>Exportar Tracklist DJ con timestamps (.txt + .md)</div>
              <div className={styles.optionDesc}>
                Lista numerada con tiempos acumulados, BPM y tonalidad Camelot para YouTube, SoundCloud o Mixcloud.
              </div>
            </div>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={exportCueSheet}
              onChange={(e) => setExportCueSheet(e.target.checked)}
              disabled={exporting}
            />
            <div>
              <div className={styles.optionLabel}>Exportar CUE Sheet (.cue)</div>
              <div className={styles.optionDesc}>
                Hoja de marcas estándar INDEX 01 (MM:SS:00) compatible con Mixcloud, Audacity, foobar2000 y sesiones grabadas.
              </div>
            </div>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={exportPrepSheetHtml}
              onChange={(e) => setExportPrepSheetHtml(e.target.checked)}
              disabled={exporting}
            />
            <div>
              <div className={styles.optionLabel}>Exportar Booth Prep Sheet (.html)</div>
              <div className={styles.optionDesc}>
                Hoja interactiva imprimible / para tablet en cabina con tiempos, BPM, tonalidades Camelot, cues y transiciones.
              </div>
            </div>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={exportStreamingCsv}
              onChange={(e) => setExportStreamingCsv(e.target.checked)}
              disabled={exporting}
            />
            <div>
              <div className={styles.optionLabel}>Exportar CSV universal para Streaming</div>
              <div className={styles.optionDesc}>
                Compatible con Apple Music, Tidal, Deezer, Soundiiz y TuneMyMusic.
              </div>
            </div>
          </label>

          <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Prefijo opcional:</span>
            <input
              type="text"
              placeholder="Ej: [FZR]  o  2026 -"
              value={playlistNamePrefix}
              onChange={(e) => setPlaylistNamePrefix(e.target.value)}
              disabled={exporting}
              style={{ flex: 1 }}
            />
          </div>

          {needsFolder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12, marginTop: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={preserveFolders}
                  onChange={(e) => setPreserveFolders(e.target.checked)}
                  disabled={exporting}
                />
                Conservar jerarquía de carpetas de Rekordbox
              </label>
              {exportM3U8 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={relativeM3uPaths}
                    onChange={(e) => setRelativeM3uPaths(e.target.checked)}
                    disabled={exporting || copyAudioFiles}
                  />
                  Usar rutas relativas en M3U8
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={copyAudioFiles}
                  onChange={(e) => setCopyAudioFiles(e.target.checked)}
                  disabled={exporting}
                />
                Copiar archivos de audio a la carpeta de destino (exportación portable para USB)
              </label>
            </div>
          )}
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
                Genera «Artista - Título» por línea para importar en <strong>Soundiiz</strong> o{' '}
                <strong>TuneMyMusic</strong> sin configurar Spotify Developer.
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
              <div className={styles.optionLabel}>Crear playlist directamente en Spotify (OAuth PKCE)</div>
              <div className={styles.optionDesc}>
                Búsqueda inteligente multi-consulta con puntuación por título, artista, duración y remix.
              </div>
            </div>
          </label>

          {exportSpotifyApi && (
            <div style={{ marginTop: 10, padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!spotifyLoggedIn ? (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                    Necesitas un <strong>Client ID</strong> de Spotify Developer (gratuito, sin Client Secret).{' '}
                    <span
                      style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => window.electronAPI.openExternal('https://developer.spotify.com/dashboard')}
                    >
                      Abrir Spotify Developer →
                    </span>
                    <br />
                    Añade <code style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4, color: 'var(--green)' }}>http://127.0.0.1:7823/callback</code> como Redirect URI.
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Spotify Client ID"
                      value={spotifyClientId}
                      onChange={(e) => setSpotifyClientId(e.target.value)}
                      disabled={spotifyLoggingIn || exporting}
                      style={{ flex: 1, fontFamily: 'monospace' }}
                    />
                    <button
                      className="btn-green"
                      onClick={handleSpotifyLogin}
                      disabled={spotifyLoggingIn || exporting}
                    >
                      {spotifyLoggingIn ? 'Esperando...' : 'Conectar Spotify'}
                    </button>
                    {spotifyLoggingIn && (
                      <button className="btn-ghost" onClick={handleCancelLogin}>
                        Cancelar
                      </button>
                    )}
                  </div>
                  {spotifyLoginError && (
                    <div style={{ fontSize: 12, color: '#ff8a80' }}>{spotifyLoginError}</div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>
                      <span style={{ color: 'var(--green)', marginRight: 6 }}>●</span>
                      Conectado como <strong>{spotifyDisplayName}</strong>
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => window.electronAPI.spotifyClearCache()}
                        disabled={exporting}
                        title="Borra la caché local de coincidencias guardadas"
                      >
                        Limpiar caché
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={handleSpotifyLogout}
                        disabled={exporting}
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={reviewBeforeCreate}
                        onChange={(e) => setReviewBeforeCreate(e.target.checked)}
                        disabled={exporting}
                      />
                      <strong>Revisar coincidencias antes de crear la playlist</strong> (recomendado para corregir remixes y temas dudosos)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={spotifyPublic}
                        onChange={(e) => setSpotifyPublic(e.target.checked)}
                        disabled={exporting}
                      />
                      Crear playlist como pública (desmarcado = privada)
                    </label>
                  </div>
                </>
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
                Se generarán subcarpetas por playlist + informes CSV y JSON
              </div>
            )}
          </section>
        )}

        {/* Spotify progress */}
        {exporting && exportSpotifyApi && spotifyProgress && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>
                Spotify — <strong>{spotifyProgress.playlistName}</strong>:{' '}
                {spotifyProgress.stage === 'creating' && 'Creando playlist...'}
                {spotifyProgress.stage === 'searching' &&
                  `Buscando ${spotifyProgress.current}/${spotifyProgress.total} (✓ ${spotifyProgress.matched} · ? ${spotifyProgress.ambiguous} · ✕ ${spotifyProgress.notFound})`}
                {spotifyProgress.stage === 'adding' && `Añadiendo pistas ${spotifyProgress.current}/${spotifyProgress.total}...`}
                {spotifyProgress.stage === 'done' && `✓ ${spotifyProgress.matched} encontradas`}
              </div>
              <button
                className="btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={handleCancelExport}
              >
                Cancelar
              </button>
            </div>
            {spotifyProgress.currentTrack && spotifyProgress.stage === 'searching' && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {spotifyProgress.currentTrack}
              </div>
            )}
            <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${spotifyProgressPct}%`, background: 'var(--green)', transition: 'width 0.2s ease' }} />
            </div>
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
          style={{ minWidth: 190 }}
        >
          {exporting
            ? 'Procesando...'
            : exportSpotifyApi && reviewBeforeCreate
              ? 'Buscar y revisar Spotify →'
              : 'Exportar ahora →'}
        </button>
      </footer>
    </div>
  )
}

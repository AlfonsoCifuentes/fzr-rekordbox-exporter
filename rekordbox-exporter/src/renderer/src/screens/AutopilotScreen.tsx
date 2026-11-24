import React, { useEffect, useMemo, useState } from 'react'
import type { Playlist } from '../../../core/common/types'
import {
  AUTOPILOT_PRESETS,
  DEFAULT_AUTOPILOT_CONFIG,
  type AutopilotConfig,
  type AutopilotPreset,
  type AutopilotProgressEvent,
  type AutopilotSessionState,
  type AutopilotTrackItem,
  type QualityFilter
} from '../../../core/soulseek/types'
import styles from './AutopilotScreen.module.css'

type Props = {
  playlists: Playlist[]
  onBack: () => void
  onLoadFile: () => void
  onImportSpotifyUrl: (url: string) => Promise<void>
  onApplyDownloadedPaths: (playlistId: string, pathMap: Record<string, string>) => void
}

function fmtDuration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function AutopilotScreen({
  playlists,
  onBack,
  onLoadFile,
  onImportSpotifyUrl,
  onApplyDownloadedPaths
}: Props): JSX.Element {
  const [config, setConfig] = useState<AutopilotConfig>(DEFAULT_AUTOPILOT_CONFIG)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(playlists[0]?.id ?? '')
  const [savedState, setSavedState] = useState<AutopilotSessionState | null>(null)
  const [progress, setProgress] = useState<AutopilotProgressEvent | null>(null)
  const [testingLogin, setTestingLogin] = useState(false)
  const [loginStatus, setLoginStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [viewTab, setViewTab] = useState<'queue' | 'logs' | 'stats'>('queue')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [importingUrl, setImportingUrl] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.soulseekGetConfig().then(setConfig).catch(() => {})
    window.electronAPI.soulseekGetSavedState().then(setSavedState).catch(() => {})
    const unsub = window.electronAPI.onSoulseekProgress((ev) => {
      setProgress(ev)
      if (ev.phase === 'completed') {
        setSavedState(null)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (playlists.length > 0 && !playlists.some((p) => p.id === selectedPlaylistId)) {
      setSelectedPlaylistId(playlists[0].id)
    }
  }, [playlists, selectedPlaylistId])

  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === selectedPlaylistId) ?? playlists[0] ?? null,
    [playlists, selectedPlaylistId]
  )

  const isRunning =
    progress?.phase === 'connecting' ||
    progress?.phase === 'running' ||
    progress?.phase === 'paused' ||
    progress?.phase === 'rate-limit'

  const updateConfig = (patch: Partial<AutopilotConfig>): void => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }

  const applyPreset = (preset: AutopilotPreset): void => {
    updateConfig({ preset, ...AUTOPILOT_PRESETS[preset] })
  }

  const handleChooseDownloadDir = async (): Promise<void> => {
    const dir = await window.electronAPI.openOutputDir()
    if (dir) updateConfig({ downloadDir: dir })
  }

  const handleTestLogin = async (): Promise<void> => {
    setTestingLogin(true)
    setLoginStatus(null)
    try {
      await window.electronAPI.soulseekSaveConfig(config)
      const res = await window.electronAPI.soulseekTestLogin(config.username, config.password)
      setLoginStatus(
        res.ok
          ? { ok: true, msg: `Conectado como ${config.username}` }
          : { ok: false, msg: res.error || 'Error de conexión' }
      )
    } catch (err) {
      setLoginStatus({ ok: false, msg: (err as Error).message })
    } finally {
      setTestingLogin(false)
    }
  }

  const handleStart = async (resume?: AutopilotSessionState): Promise<void> => {
    if (!activePlaylist) return
    setErrorMsg(null)
    try {
      await window.electronAPI.soulseekSaveConfig(config)
      const finalEvent = await window.electronAPI.soulseekStart(activePlaylist, config, resume)
      setProgress(finalEvent)
      if (finalEvent.fatalError) setErrorMsg(finalEvent.fatalError)
      if (finalEvent.phase === 'cancelled') {
        const st = await window.electronAPI.soulseekGetSavedState()
        setSavedState(st)
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Error ejecutando Soulseek Autopilot')
    }
  }

  const handleImportSpotify = async (): Promise<void> => {
    if (!spotifyUrl.trim()) return
    setImportingUrl(true)
    setErrorMsg(null)
    try {
      await onImportSpotifyUrl(spotifyUrl.trim())
      setSpotifyUrl('')
    } catch (err) {
      setErrorMsg((err as Error).message || 'No se pudo importar la playlist de Spotify')
    } finally {
      setImportingUrl(false)
    }
  }

  const downloadedPathMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (!progress) return map
    for (const t of progress.tracks) {
      if (t.savedPath) map[t.trackId] = t.savedPath
    }
    return map
  }, [progress])

  const downloadedCount = Object.keys(downloadedPathMap).length

  const pct =
    progress && progress.totalTracks > 0
      ? Math.min(100, Math.round((progress.currentIndex / progress.totalTracks) * 100))
      : 0

  const canResumeCurrent =
    Boolean(savedState) &&
    Boolean(activePlaylist) &&
    savedState!.playlistName === activePlaylist!.name &&
    savedState!.tracks.length === activePlaylist!.tracks.length &&
    !isRunning

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <button className="btn-ghost" onClick={onBack} disabled={isRunning}>
            ← Atrás
          </button>
          <h2>FZR Soulseek Autopilot</h2>
          <span className={styles.autopilotBadge}>NATIVE PROTOCOL · ZERO OCR</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {playlists.length > 0 && (
            <select
              value={activePlaylist?.id ?? ''}
              onChange={(e) => setSelectedPlaylistId(e.target.value)}
              disabled={isRunning}
              style={{ maxWidth: 260, fontSize: 12 }}
            >
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tracks.length} tracks)
                </option>
              ))}
            </select>
          )}
          <button className="btn-secondary" onClick={onLoadFile} disabled={isRunning} style={{ fontSize: 12 }}>
            Cargar archivo DJ / CSV
          </button>
        </div>
      </header>

      <div className={styles.split}>
        {/* LEFT PANE: Credentials, Presets, Quality Filters, Advanced */}
        <aside className={styles.configPane}>
          {/* Quick Spotify Public URL Import */}
          <div className={`${styles.deckBay} ${styles.deckBayGreen}`}>
            <div className={styles.bayTitle}>
              <span>
                <span className="led-dot" style={{ background: '#1db954', boxShadow: '0 0 6px #1db954' }} />
                Importar URL Spotify Pública
              </span>
              <span>NO OAUTH</span>
            </div>
            <div className={styles.fieldRow}>
              <input
                type="text"
                className={styles.input}
                placeholder="https://open.spotify.com/playlist/..."
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                disabled={isRunning || importingUrl}
              />
              <button
                className="btn-green"
                style={{ padding: '7px 12px', fontSize: 11.5, whiteSpace: 'nowrap' }}
                disabled={!spotifyUrl.trim() || isRunning || importingUrl}
                onClick={handleImportSpotify}
              >
                {importingUrl ? '...' : 'Importar'}
              </button>
            </div>
          </div>

          {/* Soulseek Account Bay */}
          <div className={`${styles.deckBay} ${styles.deckBayCyan}`}>
            <div className={styles.bayTitle}>
              <span>
                <span className="led-dot" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
                Cuenta Soulseek (Cifrada DPAPI)
              </span>
              {loginStatus && (
                <span style={{ color: loginStatus.ok ? '#46ee82' : '#ff8a80' }}>
                  {loginStatus.ok ? '● ONLINE' : '● ERROR'}
                </span>
              )}
            </div>
            <div className={styles.fieldGrid}>
              <div>
                <label className={styles.fieldLabel}>Usuario Soulseek</label>
                <input
                  type="text"
                  className={styles.input}
                  value={config.username}
                  onChange={(e) => updateConfig({ username: e.target.value })}
                  disabled={isRunning}
                  placeholder="tu_usuario_slsk"
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Contraseña (cifrada con Windows safeStorage)</label>
                <input
                  type="password"
                  className={styles.input}
                  value={config.password}
                  onChange={(e) => updateConfig({ password: e.target.value })}
                  disabled={isRunning}
                  placeholder="••••••••"
                />
              </div>
              <div className={styles.fieldRow} style={{ justifyContent: 'space-between' }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 11.5, padding: '6px 12px' }}
                  disabled={testingLogin || isRunning || !config.username || !config.password}
                  onClick={handleTestLogin}
                >
                  {testingLogin ? 'Verificando...' : 'Verificar conexión'}
                </button>
                {loginStatus && (
                  <span
                    style={{
                      fontSize: 11,
                      color: loginStatus.ok ? '#46ee82' : '#ff8a80',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {loginStatus.msg}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quality Filter Bay */}
          <div className={`${styles.deckBay} ${styles.deckBayAmber}`}>
            <div className={styles.bayTitle}>
              <span>
                <span className="led-dot" style={{ background: '#ff7a1a', boxShadow: '0 0 6px #ff7a1a' }} />
                Filtro de Calidad de Audio
              </span>
              <span>{config.qualityFilter.toUpperCase()}</span>
            </div>
            <div className={styles.padGrid4}>
              {(
                [
                  { id: 'all', title: 'Todas', sub: '320 > FLAC > 192' },
                  { id: '320+', title: '320kbps+', sub: 'MP3 320 / Lossless' },
                  { id: 'flac', title: 'Solo FLAC', sub: 'FLAC / WAV / AIFF' },
                  { id: 'hires', title: 'Hi-Res', sub: '24-bit / 96kHz+' }
                ] as Array<{ id: QualityFilter; title: string; sub: string }>
              ).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => updateConfig({ qualityFilter: q.id })}
                  className={`${styles.padBtn} ${config.qualityFilter === q.id ? styles.padBtnActiveAmber : ''}`}
                >
                  <span>{q.title}</span>
                  <small>{q.sub}</small>
                </button>
              ))}
            </div>
          </div>

          {/* Speed Presets + Download Dir + Modes */}
          <div className={styles.deckBay}>
            <div className={styles.bayTitle}>
              <span>Preset Anti-Ban & Carpeta</span>
              <span>{config.preset.toUpperCase()}</span>
            </div>

            <div className={styles.padGrid3}>
              {(
                [
                  { id: 'fast', title: 'Rápido', sub: '5s · batch 100' },
                  { id: 'balanced', title: 'Balanceado', sub: '7s · batch 50' },
                  { id: 'safe', title: 'Seguro', sub: '10s · batch 25' }
                ] as Array<{ id: AutopilotPreset; title: string; sub: string }>
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => applyPreset(p.id)}
                  className={`${styles.padBtn} ${config.preset === p.id ? styles.padBtnActive : ''}`}
                >
                  <span>{p.title}</span>
                  <small>{p.sub}</small>
                </button>
              ))}
            </div>

            <div>
              <label className={styles.fieldLabel}>Carpeta de descargas</label>
              <div className={styles.fieldRow}>
                <input
                  type="text"
                  className={styles.input}
                  value={config.downloadDir}
                  onChange={(e) => updateConfig({ downloadDir: e.target.value })}
                  disabled={isRunning}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                />
                <button
                  className="btn-secondary"
                  style={{ padding: '7px 10px', fontSize: 11.5 }}
                  onClick={handleChooseDownloadDir}
                  disabled={isRunning}
                >
                  Elegir
                </button>
              </div>
            </div>

            <label className={styles.toggleRow}>
              <span>
                <strong>Modo Dry-Run (Simulación)</strong>
                <small>Busca calidad real en Soulseek sin descargar archivos</small>
              </span>
              <input
                type="checkbox"
                checked={config.dryRun}
                disabled={isRunning}
                onChange={(e) => updateConfig({ dryRun: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <span>
                <strong>Omitir pistas ya descargadas</strong>
                <small>Comprueba la carpeta destino antes de buscar</small>
              </span>
              <input
                type="checkbox"
                checked={config.skipExistingInFolder}
                disabled={isRunning}
                onChange={(e) => updateConfig({ skipExistingInFolder: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <span>
                <strong>Notificación Windows al finalizar</strong>
                <small>Aviso nativo del sistema al completar el lote</small>
              </span>
              <input
                type="checkbox"
                checked={config.enableNotifications}
                disabled={isRunning}
                onChange={(e) => updateConfig({ enableNotifications: e.target.checked })}
              />
            </label>

            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 11.5, padding: '5px 10px' }}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? '▲ Ocultar parámetros avanzados' : '▼ Configuración avanzada de tiempos'}
            </button>

            {showAdvanced && (
              <div className={styles.numGrid}>
                <div>
                  <label className={styles.fieldLabel}>Espera búsqueda (s)</label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    className={styles.input}
                    disabled={isRunning}
                    value={Math.round(config.searchTimeoutMs / 1000)}
                    onChange={(e) =>
                      updateConfig({ searchTimeoutMs: Math.max(2, Number(e.target.value) || 7) * 1000 })
                    }
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>Pausa entre tracks (s)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    className={styles.input}
                    disabled={isRunning}
                    value={Math.round(config.downloadDelayMs / 1000)}
                    onChange={(e) =>
                      updateConfig({ downloadDelayMs: Math.max(0, Number(e.target.value) || 2) * 1000 })
                    }
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>Lote anti-ban (tracks)</label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    className={styles.input}
                    disabled={isRunning}
                    value={config.rateLimitBatch}
                    onChange={(e) =>
                      updateConfig({ rateLimitBatch: Math.max(5, Number(e.target.value) || 50) })
                    }
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>Pausa anti-ban (s)</label>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    className={styles.input}
                    disabled={isRunning}
                    value={config.rateLimitPauseSec}
                    onChange={(e) =>
                      updateConfig({ rateLimitPauseSec: Math.max(10, Number(e.target.value) || 180) })
                    }
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>Reintentos máx.</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className={styles.input}
                    disabled={isRunning}
                    value={config.maxRetries}
                    onChange={(e) =>
                      updateConfig({ maxRetries: Math.min(5, Math.max(1, Number(e.target.value) || 3)) })
                    }
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>Espera reintento (s)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className={styles.input}
                    disabled={isRunning}
                    value={Math.round(config.retryDelayMs / 1000)}
                    onChange={(e) =>
                      updateConfig({ retryDelayMs: Math.max(1, Number(e.target.value) || 5) * 1000 })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT PANE: Telemetry, Live Queue, Logs & Stats */}
        <main className={styles.monitorPane}>
          {errorMsg && (
            <div
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                background: 'rgba(239, 83, 80, 0.14)',
                border: '1px solid rgba(239, 83, 80, 0.42)',
                color: '#ffb2a8',
                fontSize: 12.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{errorMsg}</span>
              <button className="btn-ghost" style={{ padding: '2px 7px' }} onClick={() => setErrorMsg(null)}>
                ✕
              </button>
            </div>
          )}

          {canResumeCurrent && savedState && (
            <div className={styles.resumeBanner}>
              <span>
                Sesión interrumpida detectada para <strong>{savedState.playlistName}</strong> (pista{' '}
                {savedState.nextIndex + 1}/{savedState.tracks.length}).
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn-primary"
                  style={{ fontSize: 11.5, padding: '5px 12px' }}
                  onClick={() => handleStart(savedState)}
                >
                  Reanudar desde #{savedState.nextIndex + 1}
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 11.5, padding: '5px 10px' }}
                  onClick={async () => {
                    await window.electronAPI.soulseekClearSavedState()
                    setSavedState(null)
                  }}
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* Live KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Cola total</div>
              <div className={styles.kpiValue}>
                {progress ? `${progress.currentIndex}/${progress.totalTracks}` : activePlaylist?.tracks.length ?? 0}
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>{config.dryRun ? 'Halladas (Dry-Run)' : 'Descargadas'}</div>
              <div className={styles.kpiValue} style={{ color: '#46ee82' }}>
                {progress ? (config.dryRun ? progress.dryRunFound : progress.successful) : 0}
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Fallidas / Omitidas</div>
              <div className={styles.kpiValue} style={{ color: '#ffab5e' }}>
                {progress ? `${progress.failed} / ${progress.skipped}` : '0 / 0'}
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Tiempo / ETA</div>
              <div className={styles.kpiValue} style={{ fontSize: 15, fontFamily: 'var(--font-mono)', marginTop: 6 }}>
                {progress ? `${fmtDuration(progress.elapsedMs)} · ETA ${fmtDuration(progress.etaMs)}` : '00:00 · ETA —'}
              </div>
            </div>
          </div>

          {/* Live Progress Bar & Phase Readout */}
          <div className={styles.progressCard}>
            <div className={styles.progressTop}>
              <span style={{ fontWeight: 700, color: '#fff' }}>
                {progress?.phase === 'rate-limit'
                  ? `Pausa anti-ban activa — reanudando en ${progress.rateLimitRemainingSec}s`
                  : progress?.phase === 'paused'
                    ? 'Autopilot en pausa (progreso guardado)'
                    : progress?.phase === 'connecting'
                      ? 'Conectando al servidor Soulseek...'
                      : progress?.currentTrackLabel
                        ? `Procesando: ${progress.currentTrackLabel}`
                        : activePlaylist
                          ? `Listo para procesar «${activePlaylist.name}» (${activePlaylist.tracks.length} pistas)`
                          : 'Carga una playlist DJ, CSV o URL de Spotify para comenzar'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#5ce1ff' }}>
                {pct}%
              </span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Transport Controls */}
          <div className={styles.actionBar}>
            {!isRunning ? (
              <button
                className="btn-primary"
                disabled={!activePlaylist || activePlaylist.tracks.length === 0}
                onClick={() => handleStart()}
              >
                {config.dryRun ? 'Ejecutar Dry-Run en Soulseek' : 'Iniciar Soulseek Autopilot'}
              </button>
            ) : (
              <>
                {progress?.phase === 'paused' ? (
                  <button className="btn-green" onClick={() => window.electronAPI.soulseekResume()}>
                    Reanudar
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={() => window.electronAPI.soulseekPause()}>
                    Pausar
                  </button>
                )}
                <button
                  className="btn-ghost"
                  style={{ color: '#ff8a80', borderColor: 'rgba(239,83,80,0.4)' }}
                  onClick={() => window.electronAPI.soulseekCancel()}
                >
                  Cancelar lote
                </button>
              </>
            )}

            {config.downloadDir && (
              <button
                className="btn-secondary"
                style={{ fontSize: 12 }}
                onClick={() => window.electronAPI.openFolder(config.downloadDir)}
              >
                Abrir carpeta descargas
              </button>
            )}

            {progress?.reportPath && (
              <button
                className="btn-secondary"
                style={{ fontSize: 12, color: '#8cd0ff' }}
                onClick={() => window.electronAPI.openFolder(progress.reportPath!)}
              >
                Ver informe JSON
              </button>
            )}

            {downloadedCount > 0 && activePlaylist && !isRunning && (
              <button
                className="btn-blue"
                style={{ fontSize: 12, marginLeft: 'auto' }}
                onClick={() => onApplyDownloadedPaths(activePlaylist.id, downloadedPathMap)}
              >
                Vincular {downloadedCount} audios → Exportar a Traktor / Rekordbox
              </button>
            )}
          </div>

          {/* Sub-view Switcher */}
          <div className={styles.subTabs}>
            <button
              className={viewTab === 'queue' ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: 11, padding: '4px 11px' }}
              onClick={() => setViewTab('queue')}
            >
              Cola de pistas ({progress?.tracks.length ?? activePlaylist?.tracks.length ?? 0})
            </button>
            <button
              className={viewTab === 'logs' ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: 11, padding: '4px 11px' }}
              onClick={() => setViewTab('logs')}
            >
              Registro en vivo ({progress?.logs.length ?? 0})
            </button>
            <button
              className={viewTab === 'stats' ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: 11, padding: '4px 11px' }}
              onClick={() => setViewTab('stats')}
            >
              Estadísticas & Calidad
            </button>
          </div>

          {/* Queue / Logs / Stats Panel */}
          <div className={styles.queueBox}>
            {viewTab === 'queue' && (
              <>
                {((progress?.tracks ??
                  activePlaylist?.tracks.map(
                    (t): AutopilotTrackItem => ({
                      trackId: t.internalId,
                      artist: t.artist,
                      name: t.name,
                      cleanedQuery: `${t.artist} ${t.name}`,
                      status: 'pending',
                      attempts: 0
                    })
                  ) ??
                  []) as AutopilotTrackItem[]
                ).map((item, idx) => {
                  const isActiveRow =
                    isRunning && (item.status === 'searching' || item.status === 'downloading')
                  const badgeStyle =
                    item.status === 'completed' || item.status === 'dry-run'
                      ? 'tag-green'
                      : item.status === 'failed'
                        ? 'tag-red'
                        : item.status === 'searching' || item.status === 'downloading'
                          ? 'tag-blue'
                          : item.status === 'skipped-duplicate' || item.status === 'skipped-existing'
                            ? 'tag-amber'
                            : 'tag-muted'
                  const statusLabel =
                    item.status === 'completed'
                      ? '✓ Descargada'
                      : item.status === 'dry-run'
                        ? '✓ Dry-Run'
                        : item.status === 'searching'
                          ? `Buscando #${item.attempts}`
                          : item.status === 'downloading'
                            ? `Bajando ${item.downloadPercent ?? 0}%`
                            : item.status === 'failed'
                              ? 'Falló'
                              : item.status === 'skipped-duplicate'
                                ? 'Duplicado'
                                : item.status === 'skipped-existing'
                                  ? 'Ya existe'
                                  : 'En cola'

                  return (
                    <div
                      key={`${item.trackId}-${idx}`}
                      className={`${styles.queueRow} ${isActiveRow ? styles.queueRowActive : ''}`}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-subtle)' }}>
                        {idx + 1}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.trackName}>
                          {item.artist} — {item.name}
                        </div>
                        <div className={styles.trackSub}>
                          {item.peer
                            ? `Peer: ${item.peer}`
                            : item.error
                              ? item.error
                              : `Query: ${item.cleanedQuery}`}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#5ce1ff' }}>
                        {item.qualityLabel ?? '—'}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`tag ${badgeStyle}`}>{statusLabel}</span>
                      </div>
                    </div>
                  )
                })}
                {!activePlaylist && (
                  <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Pega una URL pública de Spotify a la izquierda o carga cualquier archivo DJ / CSV para llenar la cola del Autopilot.
                  </div>
                )}
              </>
            )}

            {viewTab === 'logs' && (
              <div>
                {(progress?.logs ?? []).map((entry, i) => (
                  <div key={i} className={styles.logLine}>
                    <span style={{ color: 'var(--text-subtle)', flexShrink: 0 }}>{entry.timestamp}</span>
                    <span
                      style={{
                        color:
                          entry.level === 'success'
                            ? '#46ee82'
                            : entry.level === 'warn'
                              ? '#ffab5e'
                              : entry.level === 'error'
                                ? '#ff8a80'
                                : '#8cd0ff'
                      }}
                    >
                      {entry.message}
                    </span>
                  </div>
                ))}
                {(!progress || progress.logs.length === 0) && (
                  <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    El registro técnico aparecerá aquí al iniciar el Autopilot.
                  </div>
                )}
              </div>
            )}

            {viewTab === 'stats' && (
              <div className={styles.statsPane}>
                <div>
                  <div className={styles.kpiLabel} style={{ marginBottom: 8 }}>
                    Distribución de calidad detectada
                  </div>
                  {progress && Object.keys(progress.qualityBreakdown).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(progress.qualityBreakdown).map(([q, count]) => {
                        const totalOk = Math.max(1, progress.successful + progress.dryRunFound)
                        return (
                          <div key={q} className={styles.statBarRow}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: '#5ce1ff' }}>{q}</span>
                            <div className={styles.statBarTrack}>
                              <div
                                className={styles.statBarFill}
                                style={{ width: `${Math.round((count / totalOk) * 100)}%` }}
                              />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin descargas procesadas todavía.</span>
                  )}
                </div>

                <div>
                  <div className={styles.kpiLabel} style={{ marginBottom: 8 }}>
                    Tasa de éxito por artista (Top 12)
                  </div>
                  {progress && progress.artistStats.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {progress.artistStats.slice(0, 12).map((a) => (
                        <div key={a.artist} className={styles.statBarRow}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.artist}
                          </span>
                          <div className={styles.statBarTrack}>
                            <div className={styles.statBarFill} style={{ width: `${a.successRate}%` }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                            {a.succeeded}/{a.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin estadísticas por artista todavía.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import type { ExportHistoryEntry } from '../../../core/common/types'
import {
  FzrEmblem,
  MiniRgbWaveform,
  DeckIcon,
  SpotifyWavesIcon,
  FolderTreeIcon,
  WaveformPulseIcon
} from '../components/StudioIcons'
import styles from './HomeScreen.module.css'

type Props = {
  onOpenFile: () => void
  onDropFile: (filePath: string) => void
  onImportSpotifyUrl: (url: string) => Promise<void>
  onOpenAutopilot: () => void
  errorMessage?: string | null
  onClearError?: () => void
}

export default function HomeScreen({
  onOpenFile,
  onDropFile,
  onImportSpotifyUrl,
  onOpenAutopilot,
  errorMessage,
  onClearError
}: Props): JSX.Element {
  const [dragging, setDragging] = useState(false)
  const [spotifyUser, setSpotifyUser] = useState<string | null>(null)
  const [history, setHistory] = useState<ExportHistoryEntry[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [importingUrl, setImportingUrl] = useState(false)

  useEffect(() => {
    window.electronAPI.spotifyGetStatus().then((st) => {
      if (st.loggedIn) setSpotifyUser(st.displayName)
    })
    window.electronAPI.getHistory().then(setHistory).catch(() => {})
  }, [])

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragging) setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const file = e.dataTransfer.files?.[0] as (File & { path?: string }) | undefined
    if (file?.path) {
      onDropFile(file.path)
    }
  }

  const handleClearHistory = async (): Promise<void> => {
    await window.electronAPI.clearHistory()
    setHistory([])
  }

  const handleSpotifyUrlSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!spotifyUrl.trim() || importingUrl) return
    setImportingUrl(true)
    try {
      await onImportSpotifyUrl(spotifyUrl.trim())
      setSpotifyUrl('')
    } catch {
      // handled by parent error banner
    } finally {
      setImportingUrl(false)
    }
  }

  return (
    <div
      className={`${styles.root} ${dragging ? styles.dragging : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Booth Header */}
      <div className={styles.topBar}>
        <div className={styles.brandLeft}>
          <FzrEmblem size={28} />
          <span className={styles.brandName}>FZR</span>
          <span className={styles.versionPill}>v2.0.0 · Booth OS</span>
        </div>

        <div className={styles.signalStrip}>
          <span className={styles.signalNode} style={{ color: '#6cc2ff' }}>
            <i style={{ background: '#0095ff', boxShadow: '0 0 8px #0095ff' }} />
            REKORDBOX
          </span>
          <span className={styles.signalArrow}>⇄</span>
          <span className={styles.signalNode} style={{ color: '#ffab5e' }}>
            <i style={{ background: '#ff7a1a', boxShadow: '0 0 8px #ff7a1a' }} />
            TRAKTOR
          </span>
          <span className={styles.signalArrow}>⇄</span>
          <span className={styles.signalNode} style={{ color: '#5ce1ff' }}>
            <i style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
            SOULSEEK
          </span>
          <span className={styles.signalArrow}>⇄</span>
          <span className={styles.signalNode} style={{ color: '#46ee82' }}>
            <i style={{ background: '#1db954', boxShadow: '0 0 8px #1db954' }} />
            SPOTIFY
          </span>
        </div>

        <div className={styles.topRight}>
          <button
            className="btn-secondary"
            style={{
              fontSize: 12,
              padding: '5px 12px',
              borderRadius: 999,
              color: '#5ce1ff',
              borderColor: 'rgba(0, 212, 255, 0.38)'
            }}
            onClick={onOpenAutopilot}
          >
            <span className="led-dot" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
            Soulseek Autopilot
          </button>
          {spotifyUser && (
            <span className={styles.spotifyBadge}>
              <span className={styles.spotifyDot} />
              {spotifyUser}
            </span>
          )}
          <button
            className="btn-ghost"
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 999 }}
            onClick={() => setShowHelp((v) => !v)}
          >
            {showHelp ? 'Cerrar guía' : '? Guía rápida'}
          </button>
        </div>
      </div>

      <div className={styles.main}>
        {/* Hero */}
        <div className={styles.logo}>
          <h1 className={styles.title}>
            <span className={styles.titleGrad}>FZR</span> Rekordbox Exporter
          </h1>
          <p className={styles.subtitle}>
            Estación bidireccional para cabinas DJ: convierte librerías entre{' '}
            <strong style={{ color: '#6cc2ff' }}>Rekordbox</strong>,{' '}
            <strong style={{ color: '#ffab5e' }}>Traktor Pro</strong> y{' '}
            <strong style={{ color: '#46ee82' }}>Spotify</strong> con Hot Cues, curva BPM y flujo armónico Camelot.
          </p>
        </div>

        {errorMessage && (
          <div className={styles.errorBanner}>
            <span>⚠️ {errorMessage}</span>
            {onClearError && (
              <button
                className="btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={onClearError}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Jog-Wheel Studio Drop Deck */}
        <div
          className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
          onClick={onOpenFile}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenFile()
          }}
        >
          <div className={styles.platterWrap}>
            <div className={styles.platterOuterRing} />
            <FzrEmblem size={68} />
          </div>

          <MiniRgbWaveform bars={32} height={20} />

          <div className={styles.dropTitle}>
            {dragging
              ? 'Suelta tu librería o playlist en el deck'
              : 'Arrastra tu exportación de Rekordbox, Traktor o Streaming aquí'}
          </div>

          <div className={styles.formats}>
            <span className={styles.formatBadgeBlue}>.xml Rekordbox / VDJ</span>
            <span className={styles.formatBadgeAmber}>.nml Traktor</span>
            <span className={styles.formatBadge}>.crate Serato</span>
            <span className={styles.formatBadge}>.m3u8 / .txt</span>
            <span className={styles.formatBadgeGreen}>.csv Spotify</span>
          </div>

          <button
            className="btn-primary"
            style={{ fontSize: 14, padding: '11px 28px', marginTop: 4 }}
            onClick={(e) => {
              e.stopPropagation()
              onOpenFile()
            }}
          >
            Cargar librería o playlist
          </button>
        </div>

        {/* Direct Public Spotify Playlist URL Importer + Autopilot Launchpad */}
        <form
          onSubmit={handleSpotifyUrlSubmit}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(13, 17, 27, 0.9)',
            border: '1px solid rgba(29, 185, 84, 0.28)'
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              fontWeight: 700,
              color: '#46ee82',
              whiteSpace: 'nowrap'
            }}
          >
            SPOTIFY URL
          </span>
          <input
            type="text"
            placeholder="Pega una URL de playlist pública de Spotify (https://open.spotify.com/playlist/...)"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            disabled={importingUrl}
            style={{ flex: 1, fontSize: 12.5 }}
          />
          <button
            type="submit"
            className="btn-green"
            style={{ fontSize: 12, padding: '7px 14px', whiteSpace: 'nowrap' }}
            disabled={!spotifyUrl.trim() || importingUrl}
          >
            {importingUrl ? 'Importando...' : 'Importar playlist'}
          </button>
        </form>

        {/* Studio Feature Cards */}
        <div className={styles.features}>
          <div className={`${styles.feature} ${styles.featureAmber}`}>
            <div className={styles.featureIconWrap} style={{ background: 'rgba(255,122,26,0.14)', borderColor: 'rgba(255,122,26,0.32)' }}>
              <DeckIcon color="#ff9947" />
            </div>
            <div>
              <strong>Traktor NML v19 ⇄ Rekordbox XML</strong>
              <p>Conversión bidireccional con Hot Cues, Loops, Open Key ↔ Camelot y rutas nativas</p>
            </div>
          </div>

          <div className={`${styles.feature} ${styles.featureGreen}`}>
            <div className={styles.featureIconWrap} style={{ background: 'rgba(29,185,84,0.14)', borderColor: 'rgba(29,185,84,0.32)' }}>
              <SpotifyWavesIcon color="#2ee06e" />
            </div>
            <div>
              <strong>Spotify PKCE + Importador por URL</strong>
              <p>Crea playlists con revisión manual o importa playlists públicas de Spotify sin API keys</p>
            </div>
          </div>

          <div className={`${styles.feature} ${styles.featureBlue}`}>
            <div className={styles.featureIconWrap} style={{ background: 'rgba(0,149,255,0.14)', borderColor: 'rgba(0,149,255,0.32)' }}>
              <WaveformPulseIcon color="#52b8ff" />
            </div>
            <div>
              <strong>Análisis Camelot, Curva BPM y Diff</strong>
              <p>Rueda armónica, auto-orden, limpiador de tags, zonas BPM, fusión y duplicados</p>
            </div>
          </div>

          <div
            className={`${styles.feature} ${styles.featureSilver}`}
            onClick={onOpenAutopilot}
            style={{ cursor: 'pointer', borderTopColor: 'rgba(0, 212, 255, 0.65)' }}
          >
            <div className={styles.featureIconWrap} style={{ background: 'rgba(0,212,255,0.14)', borderColor: 'rgba(0,212,255,0.36)' }}>
              <FolderTreeIcon color="#5ce1ff" />
            </div>
            <div>
              <strong style={{ color: '#8ceeff' }}>FZR Soulseek Autopilot Integrado →</strong>
              <p>Búsqueda nativa FLAC / Hi-Res / 320kbps, presets anti-ban, Dry-Run, Pausa/Reanudar e informes JSON</p>
            </div>
          </div>
        </div>

        {/* Recent Export History */}
        {history.length > 0 && (
          <div className={styles.historyBox}>
            <div className={styles.historyHeader}>
              <span>Sesiones recientes</span>
              <button
                className="btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={handleClearHistory}
              >
                Limpiar
              </button>
            </div>
            <div className={styles.historyList}>
              {history.slice(0, 4).map((item) => (
                <div key={item.id} className={styles.historyItem}>
                  <div className={styles.historyInfo}>
                    <strong>{item.sourceFile}</strong>
                    <span className={styles.historyMeta}>
                      {item.playlistCount} playlist{item.playlistCount !== 1 ? 's' : ''} ·{' '}
                      {item.totalTracks} tracks · {item.formats.join(' + ')} ·{' '}
                      {new Date(item.exportedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.historyActions}>
                    {item.outputDir && (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '3px 9px' }}
                        onClick={() => window.electronAPI.openFolder(item.outputDir!)}
                      >
                        Carpeta
                      </button>
                    )}
                    {item.spotifyUrls[0] && (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '3px 9px', color: 'var(--sp-green)' }}
                        onClick={() => window.electronAPI.openExternal(item.spotifyUrls[0])}
                      >
                        Spotify →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className={styles.modalBackdrop} onClick={() => setShowHelp(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FzrEmblem size={24} />
                <h3>Guía rápida de cabina</h3>
              </div>
              <button className="btn-ghost" style={{ padding: '4px 10px' }} onClick={() => setShowHelp(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <h4>1. Importar desde Rekordbox, Traktor o Streaming</h4>
              <ul>
                <li><strong>Rekordbox XML (recomendado):</strong> <em>File → Export Collection in rekordbox xml format</em> (incluye carpetas, BPM, Key y Hot Cues).</li>
                <li><strong>Traktor Pro NML:</strong> exporta tu playlist o colección como <code>.nml</code> y arrástrala directamente.</li>
                <li><strong>M3U8, TXT o CSV:</strong> compatible con Rekordbox UTF-16 TXT, Exportify y Soundiiz.</li>
              </ul>

              <h4>2. Importar en Traktor Pro o Rekordbox</h4>
              <ul>
                <li>En Traktor: <em>File → Import → Import Playlist...</em> y elige el <code>.nml</code> o <code>.m3u8</code>.</li>
                <li>En Rekordbox: activa la vista <em>rekordbox xml</em> en Preferencias y carga el archivo <code>_rekordbox.xml</code>.</li>
              </ul>

              <h4>3. Conectar Spotify (OAuth PKCE sin secreto)</h4>
              <ul>
                <li>Crea una app gratuita en <strong>developer.spotify.com/dashboard</strong>.</li>
                <li>Añade exactamente <code>http://127.0.0.1:7823/callback</code> en Redirect URIs y pega tu Client ID en la pantalla de exportación.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import type { ExportHistoryEntry } from '../../../core/common/types'
import styles from './HomeScreen.module.css'

type Props = {
  onOpenFile: () => void
  onDropFile: (filePath: string) => void
  errorMessage?: string | null
  onClearError?: () => void
}

export default function HomeScreen({
  onOpenFile,
  onDropFile,
  errorMessage,
  onClearError
}: Props): JSX.Element {
  const [dragging, setDragging] = useState(false)
  const [spotifyUser, setSpotifyUser] = useState<string | null>(null)
  const [history, setHistory] = useState<ExportHistoryEntry[]>([])
  const [showHelp, setShowHelp] = useState(false)

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

  return (
    <div
      className={`${styles.root} ${dragging ? styles.dragging : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.topBar}>
        <div className={styles.versionPill}>FZR v1.4.0 · 100% Local · Bidireccional</div>
        <div className={styles.topRight}>
          {spotifyUser && (
            <span className={styles.spotifyBadge}>
              <span className={styles.spotifyDot} />
              Spotify: {spotifyUser}
            </span>
          )}
          <button
            className="btn-ghost"
            style={{ fontSize: 12, padding: '5px 12px' }}
            onClick={() => setShowHelp((v) => !v)}
          >
            {showHelp ? 'Cerrar ayuda' : '? Cómo exportar'}
          </button>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>▶</div>
          <h1 className={styles.title}>FZR Rekordbox Exporter</h1>
          <p className={styles.subtitle}>
            Hub bidireccional para DJs: convierte entre <strong>Rekordbox</strong>,{' '}
            <strong>Traktor Pro</strong> y <strong>Spotify</strong> con cue points, análisis armónico Camelot y revisión inteligente
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

        <div
          className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
          onClick={onOpenFile}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenFile()
          }}
        >
          <div className={styles.dropIcon}>{dragging ? '📥' : '📂'}</div>
          <div className={styles.dropTitle}>
            {dragging
              ? 'Suelta tu archivo de Rekordbox o Traktor aquí'
              : 'Arrastra tu exportación de Rekordbox / Traktor o haz clic para seleccionar'}
          </div>
          <div className={styles.formats}>
            <span className={styles.formatBadge}>.xml (Rekordbox)</span>
            <span className={styles.formatBadge}>.nml (Traktor)</span>
            <span className={styles.formatBadge}>.m3u8</span>
            <span className={styles.formatBadge}>.m3u</span>
            <span className={styles.formatBadge}>.txt</span>
            <span className={styles.formatBadge}>.csv (Spotify/Streaming)</span>
          </div>
          <button
            className="btn-primary"
            style={{ fontSize: 14, padding: '10px 24px', marginTop: 6 }}
            onClick={(e) => {
              e.stopPropagation()
              onOpenFile()
            }}
          >
            Importar librería o playlist
          </button>
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🎛️</div>
            <div>
              <strong>Traktor NML v19 + M3U8</strong>
              <p>Exporta colecciones .nml válidas con BPM, tonalidad Open Key, cue points y rutas exactas</p>
            </div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>💚</div>
            <div>
              <strong>Spotify Fuzzy + Revisión</strong>
              <p>Matching inteligente multi-consulta con puntuación de confianza y revisión manual previa</p>
            </div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📁</div>
            <div>
              <strong>Carpetas y Audio Portable</strong>
              <p>Conserva carpetas anidadas de Rekordbox y opcionalmente copia los audios a destino</p>
            </div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📊</div>
            <div>
              <strong>Informes CSV &amp; JSON</strong>
              <p>Registro por pista de rutas rotas, estado de Spotify y confianza de cada coincidencia</p>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className={styles.historyBox}>
            <div className={styles.historyHeader}>
              <span>Exportaciones recientes</span>
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
                        style={{ fontSize: 11, padding: '3px 8px' }}
                        onClick={() => window.electronAPI.openFolder(item.outputDir!)}
                      >
                        Carpeta
                      </button>
                    )}
                    {item.spotifyUrls[0] && (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '3px 8px', color: 'var(--green)' }}
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

      {showHelp && (
        <div className={styles.modalBackdrop} onClick={() => setShowHelp(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Guía rápida de exportación</h3>
              <button className="btn-ghost" style={{ padding: '4px 10px' }} onClick={() => setShowHelp(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <h4>1. Exportar desde Rekordbox</h4>
              <ul>
                <li><strong>XML completo (recomendado):</strong> Menú <em>File → Export Collection in rekordbox xml format</em>. Incluye carpetas, BPM, tonalidad y cue points.</li>
                <li><strong>M3U8 o TXT:</strong> Clic derecho en una playlist → <em>Export Playlist</em> → elige <code>.m3u8</code> o <code>.txt</code> (compatible con UTF-16 de Rekordbox).</li>
              </ul>

              <h4>2. Importar en Traktor Pro</h4>
              <ul>
                <li>Abre Traktor → <em>File → Import → Import Another Collection / Import Playlist...</em></li>
                <li>Selecciona el archivo <code>.nml</code> generado (o el <code>.m3u8</code> como alternativa universal).</li>
                <li>Nunca modificamos tu <code>collection.nml</code> original.</li>
              </ul>

              <h4>3. Conectar Spotify (OAuth PKCE)</h4>
              <ul>
                <li>Crea una app gratuita en <strong>developer.spotify.com/dashboard</strong>.</li>
                <li>Añade exactamente <code>http://127.0.0.1:7823/callback</code> como Redirect URI.</li>
                <li>Pega el <strong>Client ID</strong> en la pantalla de exportación e inicia sesión (sin Client Secret).</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import type { DetectedDjEnvironment, ExportHistoryEntry } from '../../../core/common/types'
import {
  FzrEmblem,
  DeckIcon,
  SpotifyWavesIcon,
  FolderTreeIcon,
  WaveformPulseIcon
} from '../components/StudioIcons'
import styles from './HomeScreen.module.css'

type Props = {
  djEnv: DetectedDjEnvironment | null
  scanningEnv: boolean
  onRescanPc: () => void
  onOpenFile: () => void
  onDropFile: (filePath: string) => void
  onLoadDetectedFile: (filePath: string) => void
  onLoadSeratoCrates: (cratePaths: string[]) => void
  onImportSpotifyUrl: (url: string) => Promise<void>
  onOpenAutopilot: () => void
  onOpenPlaylists: () => void
  errorMessage?: string | null
  onClearError?: () => void
}

export default function HomeScreen({
  djEnv,
  scanningEnv,
  onRescanPc,
  onOpenFile,
  onDropFile,
  onLoadDetectedFile,
  onLoadSeratoCrates,
  onImportSpotifyUrl,
  onOpenAutopilot,
  onOpenPlaylists,
  errorMessage,
  onClearError
}: Props): JSX.Element {
  const [dragging, setDragging] = useState(false)
  const [spotifyUser, setSpotifyUser] = useState<string | null>(null)
  const [history, setHistory] = useState<ExportHistoryEntry[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [importingUrl, setImportingUrl] = useState(false)
  const [selectedRbFile, setSelectedRbFile] = useState('')
  const [selectedTrFile, setSelectedTrFile] = useState('')
  const spotifyInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    window.electronAPI.spotifyGetStatus().then((st) => {
      if (st.loggedIn) setSpotifyUser(st.displayName)
    })
    window.electronAPI.getHistory().then(setHistory).catch(() => {})
  }, [])

  useEffect(() => {
    if (djEnv?.rekordbox.libraryFiles[0] && !selectedRbFile) {
      setSelectedRbFile(djEnv.rekordbox.libraryFiles[0].path)
    }
    if (djEnv?.traktor.libraryFiles[0] && !selectedTrFile) {
      setSelectedTrFile(djEnv.traktor.libraryFiles[0].path)
    }
  }, [djEnv, selectedRbFile, selectedTrFile])

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

  const handleSpotifySubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!spotifyUrl.trim() || importingUrl) return
    setImportingUrl(true)
    try {
      await onImportSpotifyUrl(spotifyUrl.trim())
      setSpotifyUrl('')
    } catch {
      // handled by error banner
    } finally {
      setImportingUrl(false)
    }
  }

  const handleClearHistory = async (): Promise<void> => {
    await window.electronAPI.clearHistory()
    setHistory([])
  }

  const rb = djEnv?.rekordbox
  const tr = djEnv?.traktor
  const sr = djEnv?.serato
  const vdj = djEnv?.virtualdj

  return (
    <div
      className={`${styles.root} ${dragging ? styles.dragging : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.heroHeader}>
          <div>
            <h1 className={styles.heroTitle}>
              Bienvenido a <span>FZR Booth OS</span>
            </h1>
            <p className={styles.heroSub}>
              Todo tu flujo DJ en un solo sitio: detecta tus librerías automáticamente, convierte entre plataformas o descarga con Soulseek Autopilot.
            </p>
          </div>
          <div className={styles.heroActions}>
            {spotifyUser && (
              <span className={styles.spotifyPill}>
                <span className="led-dot" style={{ background: '#1db954', boxShadow: '0 0 8px #1db954', marginRight: 0 }} />
                Spotify: {spotifyUser}
              </span>
            )}
            <button
              className="btn-ghost"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={() => setShowHelp(true)}
            >
              ? Cómo exportar desde tu app DJ
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className={styles.errorBanner}>
            <span>{errorMessage}</span>
            {onClearError && (
              <button className="btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={onClearError}>
                ✕
              </button>
            )}
          </div>
        )}

        {/* SECTION 1: Auto-Detected DJ Software on User's PC */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionTop}>
            <div className={styles.sectionHeading}>
              <span className="led-dot" style={{ background: '#1db954', boxShadow: '0 0 8px #1db954', marginRight: 0 }} />
              1. Detectado automáticamente en tu ordenador
            </div>
            <button
              className="btn-ghost"
              style={{ fontSize: 11.5, padding: '4px 10px' }}
              onClick={onRescanPc}
              disabled={scanningEnv}
            >
              {scanningEnv ? 'Escaneando PC...' : '↻ Re-escanear PC'}
            </button>
          </div>

          <div className={styles.detectGrid}>
            {/* Rekordbox Card */}
            <div className={styles.detectCard} style={{ borderTop: '2px solid rgba(0,149,255,0.7)' }}>
              <div className={styles.detectCardTop}>
                <span className={styles.detectName}>Rekordbox</span>
                <span
                  className={styles.statusChip}
                  style={{
                    background: rb?.installed ? 'rgba(0,149,255,0.16)' : 'rgba(255,255,255,0.05)',
                    color: rb?.installed ? '#6cc2ff' : 'var(--text-subtle)'
                  }}
                >
                  {rb?.libraryFiles.length
                    ? '● XML LISTO'
                    : rb?.installed
                      ? '● INSTALADO'
                      : 'NO DETECTADO'}
                </span>
              </div>
              <div className={styles.detectDetail}>
                {rb?.libraryFiles.length ? (
                  <>
                    <strong>{rb.versionLabel ?? 'Rekordbox'}</strong> · {rb.libraryFiles.length} exportación XML encontrada.
                  </>
                ) : rb?.installed ? (
                  <>
                    <strong>{rb.versionLabel}</strong> encontrado. En Rekordbox pulsa <em>File → Export Collection in rekordbox xml format</em>.
                  </>
                ) : (
                  'No instalado en rutas estándar. Puedes cargar cualquier XML/TXT manualmente.'
                )}
              </div>
              {rb && rb.libraryFiles.length > 1 && (
                <select
                  className={styles.detectFileSelect}
                  value={selectedRbFile}
                  onChange={(e) => setSelectedRbFile(e.target.value)}
                >
                  {rb.libraryFiles.map((f) => (
                    <option key={f.path} value={f.path}>
                      {f.label}
                    </option>
                  ))}
                </select>
              )}
              <div className={styles.detectActions}>
                {rb?.libraryFiles.length ? (
                  <button
                    className="btn-blue"
                    style={{ fontSize: 11.5, padding: '6px 12px', flex: 1 }}
                    onClick={() => onLoadDetectedFile(selectedRbFile || rb.libraryFiles[0].path)}
                  >
                    Cargar en 1 clic →
                  </button>
                ) : (
                  <>
                    {rb?.appExePath && (
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: '6px 10px' }}
                        onClick={() => window.electronAPI.launchApp(rb.appExePath!)}
                      >
                        Abrir Rekordbox
                      </button>
                    )}
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                      onClick={onOpenFile}
                    >
                      Elegir XML
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Traktor Pro Card */}
            <div className={styles.detectCard} style={{ borderTop: '2px solid rgba(255,122,26,0.7)' }}>
              <div className={styles.detectCardTop}>
                <span className={styles.detectName}>Traktor Pro</span>
                <span
                  className={styles.statusChip}
                  style={{
                    background: tr?.libraryFiles.length
                      ? 'rgba(255,122,26,0.18)'
                      : tr?.installed
                        ? 'rgba(255,122,26,0.12)'
                        : 'rgba(255,255,255,0.05)',
                    color: tr?.installed ? '#ffab5e' : 'var(--text-subtle)'
                  }}
                >
                  {tr?.libraryFiles.length
                    ? '● NML LISTO'
                    : tr?.installed
                      ? '● INSTALADO'
                      : 'NO DETECTADO'}
                </span>
              </div>
              <div className={styles.detectDetail}>
                {tr?.libraryFiles.length ? (
                  <>
                    <strong>{tr.versionLabel ?? 'Traktor'}</strong> · <code>collection.nml</code> detectada automáticamente.
                  </>
                ) : tr?.installed ? (
                  <>
                    <strong>{tr.versionLabel}</strong> detectado. Puedes cargar cualquier playlist <code>.nml</code>.
                  </>
                ) : (
                  'Traktor Pro no detectado en Documentos/Native Instruments. Puedes importar o exportar .NML igualmente.'
                )}
              </div>
              {tr && tr.libraryFiles.length > 1 && (
                <select
                  className={styles.detectFileSelect}
                  value={selectedTrFile}
                  onChange={(e) => setSelectedTrFile(e.target.value)}
                >
                  {tr.libraryFiles.map((f) => (
                    <option key={f.path} value={f.path}>
                      {f.label}
                    </option>
                  ))}
                </select>
              )}
              <div className={styles.detectActions}>
                {tr?.libraryFiles.length ? (
                  <button
                    className="btn-primary"
                    style={{
                      fontSize: 11.5,
                      padding: '6px 12px',
                      flex: 1,
                      background: 'linear-gradient(135deg, #ff7a1a, #e55f00)',
                      color: '#fff'
                    }}
                    onClick={() => onLoadDetectedFile(selectedTrFile || tr.libraryFiles[0].path)}
                  >
                    Cargar colección →
                  </button>
                ) : (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                    onClick={onOpenFile}
                  >
                    Abrir archivo .NML
                  </button>
                )}
              </div>
            </div>

            {/* Serato DJ Card */}
            <div className={styles.detectCard} style={{ borderTop: '2px solid rgba(127,211,255,0.6)' }}>
              <div className={styles.detectCardTop}>
                <span className={styles.detectName}>Serato DJ</span>
                <span
                  className={styles.statusChip}
                  style={{
                    background: sr?.libraryFiles.length ? 'rgba(127,211,255,0.16)' : 'rgba(255,255,255,0.05)',
                    color: sr?.installed ? '#9ee0ff' : 'var(--text-subtle)'
                  }}
                >
                  {sr?.libraryFiles.length ? `● ${sr.libraryFiles.length} CRATES` : sr?.installed ? '● INSTALADO' : 'NO DETECTADO'}
                </span>
              </div>
              <div className={styles.detectDetail}>
                {sr?.libraryFiles.length
                  ? `${sr.libraryFiles.length} archivo(s) .crate encontrados en Música/_Serato_/Subcrates.`
                  : 'Soporte nativo para importar archivos binarios .crate de Serato DJ Pro / Lite.'}
              </div>
              <div className={styles.detectActions}>
                {sr?.libraryFiles.length ? (
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 11.5, padding: '6px 12px', flex: 1, color: '#9ee0ff' }}
                    onClick={() => onLoadSeratoCrates(sr.libraryFiles.map((f) => f.path))}
                  >
                    Cargar {sr.libraryFiles.length} crates →
                  </button>
                ) : (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                    onClick={onOpenFile}
                  >
                    Abrir .crate
                  </button>
                )}
              </div>
            </div>

            {/* VirtualDJ Card */}
            <div className={styles.detectCard} style={{ borderTop: '2px solid rgba(232,237,247,0.45)' }}>
              <div className={styles.detectCardTop}>
                <span className={styles.detectName}>VirtualDJ</span>
                <span
                  className={styles.statusChip}
                  style={{
                    background: vdj?.libraryFiles.length ? 'rgba(232,237,247,0.14)' : 'rgba(255,255,255,0.05)',
                    color: vdj?.installed ? '#e8edf7' : 'var(--text-subtle)'
                  }}
                >
                  {vdj?.libraryFiles.length ? '● DB LISTA' : vdj?.installed ? '● INSTALADO' : 'NO DETECTADO'}
                </span>
              </div>
              <div className={styles.detectDetail}>
                {vdj?.libraryFiles.length
                  ? 'database.xml de VirtualDJ encontrada en Documentos/VirtualDJ.'
                  : 'Lee colecciones database.xml y carpetas .vdjfolder con BPM, tonalidad y cues.'}
              </div>
              <div className={styles.detectActions}>
                {vdj?.libraryFiles.length ? (
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 11.5, padding: '6px 12px', flex: 1 }}
                    onClick={() => onLoadDetectedFile(vdj.libraryFiles[0].path)}
                  >
                    Cargar VirtualDJ →
                  </button>
                ) : (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                    onClick={onOpenFile}
                  >
                    Abrir database.xml
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 4 Crystal-Clear Direct Workflows */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeading}>
            <span className="led-dot" style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff', marginRight: 0 }} />
            2. ¿Qué quieres hacer hoy? (Acceso directo)
          </div>

          <div className={styles.workflowGrid}>
            <button
              type="button"
              className={styles.workflowCard}
              style={{ borderLeft: '3px solid #00d4ff' }}
              onClick={onOpenAutopilot}
            >
              <div className={styles.workflowIcon} style={{ background: 'rgba(0,212,255,0.14)', borderColor: 'rgba(0,212,255,0.38)' }}>
                <FolderTreeIcon color="#5ce1ff" />
              </div>
              <div>
                <div className={styles.workflowTitle}>FZR Soulseek Autopilot (Descargar música)</div>
                <div className={styles.workflowDesc}>
                  Busca y descarga playlists en FLAC, Hi-Res o 320kbps con presets anti-ban, Dry-Run, Pausa/Reanudar e informes JSON.
                  {djEnv?.suggestedDownloadDir ? ' · Carpeta Soulseek detectada.' : ''}
                </div>
              </div>
              <span className={styles.workflowArrow}>→</span>
            </button>

            <button
              type="button"
              className={styles.workflowCard}
              style={{ borderLeft: '3px solid #ff7a1a' }}
              onClick={onOpenFile}
            >
              <div className={styles.workflowIcon} style={{ background: 'rgba(255,122,26,0.14)', borderColor: 'rgba(255,122,26,0.38)' }}>
                <DeckIcon color="#ff9947" />
              </div>
              <div>
                <div className={styles.workflowTitle}>Convertir Rekordbox ⇄ Traktor Pro</div>
                <div className={styles.workflowDesc}>
                  Pasa sets completos entre XML y NML v19 conservando Hot Cues, Loops, Open Key ↔ Camelot y copia USB portable.
                </div>
              </div>
              <span className={styles.workflowArrow}>→</span>
            </button>

            <button
              type="button"
              className={styles.workflowCard}
              style={{ borderLeft: '3px solid #1db954' }}
              onClick={() => spotifyInputRef.current?.focus()}
            >
              <div className={styles.workflowIcon} style={{ background: 'rgba(29,185,84,0.14)', borderColor: 'rgba(29,185,84,0.38)' }}>
                <SpotifyWavesIcon color="#3ee87b" />
              </div>
              <div>
                <div className={styles.workflowTitle}>Spotify ⇄ Cabina DJ (Bidireccional)</div>
                <div className={styles.workflowDesc}>
                  Importa cualquier playlist pública de Spotify pegando su URL abajo, o publica tus playlists DJ en Spotify con revisión manual.
                </div>
              </div>
              <span className={styles.workflowArrow}>→</span>
            </button>

            <button
              type="button"
              className={styles.workflowCard}
              style={{ borderLeft: '3px solid #0095ff' }}
              onClick={onOpenPlaylists}
            >
              <div className={styles.workflowIcon} style={{ background: 'rgba(0,149,255,0.14)', borderColor: 'rgba(0,149,255,0.38)' }}>
                <WaveformPulseIcon color="#52b8ff" />
              </div>
              <div>
                <div className={styles.workflowTitle}>Analizar Set: Rueda Camelot, Curva BPM y Tags</div>
                <div className={styles.workflowDesc}>
                  Orden armónico Camelot, limpiar etiquetas sucias, corregir BPM ×2/÷2, reparar rutas perdidas y Hoja HTML de Cabina.
                </div>
              </div>
              <span className={styles.workflowArrow}>→</span>
            </button>
          </div>
        </section>

        {/* SECTION 3: Drag & Drop File OR Paste Spotify URL */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeading}>
            <span className="led-dot" style={{ background: '#0095ff', boxShadow: '0 0 8px #0095ff', marginRight: 0 }} />
            3. Cargar archivo manual o importar desde enlace de Spotify
          </div>

          <div className={styles.inputGrid}>
            <div
              className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
              onClick={onOpenFile}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onOpenFile()
              }}
            >
              <div className={styles.dropTop}>
                <FzrEmblem size={44} />
                <div>
                  <div className={styles.dropTitle}>
                    {dragging ? 'Suelta tu archivo aquí' : 'Arrastra cualquier archivo DJ o CSV aquí'}
                  </div>
                  <div className={styles.dropSub}>
                    O haz clic para explorar tu PC (detección automática de formato y codificación)
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10, flexWrap: 'wrap' }}>
                <div className={styles.formats}>
                  <span className={styles.formatPill}>.XML</span>
                  <span className={styles.formatPill}>.NML</span>
                  <span className={styles.formatPill}>.CRATE</span>
                  <span className={styles.formatPill}>.M3U8</span>
                  <span className={styles.formatPill}>.TXT</span>
                  <span className={styles.formatPill}>.CSV</span>
                </div>
                <button
                  type="button"
                  className="btn-blue"
                  style={{ fontSize: 12, padding: '7px 16px' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenFile()
                  }}
                >
                  Elegir archivo
                </button>
              </div>
            </div>

            <form className={styles.spotifyCard} onSubmit={handleSpotifySubmit}>
              <div>
                <div className={styles.dropTitle} style={{ color: '#46ee82' }}>
                  Importar Playlist Pública de Spotify
                </div>
                <div className={styles.dropSub}>
                  Sin iniciar sesión ni API keys. Pega el enlace y llévala directo a Soulseek Autopilot, Traktor o Rekordbox.
                </div>
              </div>
              <div className={styles.spotifyForm}>
                <input
                  ref={spotifyInputRef}
                  type="text"
                  placeholder="https://open.spotify.com/playlist/..."
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  disabled={importingUrl}
                  style={{ flex: 1, fontSize: 12 }}
                />
                <button
                  type="submit"
                  className="btn-green"
                  style={{ fontSize: 12, padding: '7px 14px', whiteSpace: 'nowrap' }}
                  disabled={!spotifyUrl.trim() || importingUrl}
                >
                  {importingUrl ? '...' : 'Importar →'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Recent History */}
        {history.length > 0 && (
          <div className={styles.historyBox}>
            <div className={styles.historyHeader}>
              <span>Sesiones recientes</span>
              <button className="btn-ghost" style={{ fontSize: 10.5, padding: '2px 8px' }} onClick={handleClearHistory}>
                Limpiar
              </button>
            </div>
            {history.slice(0, 3).map((item) => (
              <div key={item.id} className={styles.historyItem}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 12.5, display: 'block' }}>{item.sourceFile}</strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {item.playlistCount} pl · {item.totalTracks} tracks · {item.formats.join(' + ')} ·{' '}
                    {new Date(item.exportedAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {item.outputDir && (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 9px' }}
                      onClick={() => window.electronAPI.openFolder(item.outputDir!)}
                    >
                      Abrir carpeta
                    </button>
                  )}
                  {item.spotifyUrls[0] && (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 9px', color: '#46ee82' }}
                      onClick={() => window.electronAPI.openExternal(item.spotifyUrls[0])}
                    >
                      Spotify →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Guide Modal */}
      {showHelp && (
        <div className={styles.modalBackdrop} onClick={() => setShowHelp(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <FzrEmblem size={22} />
                <strong>Guía rápida de importación</strong>
              </div>
              <button className="btn-ghost" style={{ padding: '3px 9px' }} onClick={() => setShowHelp(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <h4>Rekordbox (5, 6 y 7)</h4>
              <p>
                Rekordbox guarda su base de datos en un archivo cifrado (<code>master.db</code>). Para leerla con todas tus carpetas, BPM, Key y Hot Cues, abre Rekordbox y pulsa <code>File → Export Collection in rekordbox xml format</code>. En cuanto lo guardes en Documentos o Escritorio, FZR lo detectará automáticamente.
              </p>
              <h4>Traktor Pro (3 y 4)</h4>
              <p>
                FZR detecta automáticamente <code>Documentos/Native Instruments/Traktor */collection.nml</code> y la carga en 1 clic sin pasos extra.
              </p>
              <h4>Serato DJ y VirtualDJ</h4>
              <p>
                Se detectan automáticamente <code>Música/_Serato_/Subcrates/*.crate</code> y <code>Documentos/VirtualDJ/database.xml</code>.
              </p>
              <h4>Spotify → Soulseek Autopilot</h4>
              <p>
                Pega cualquier URL de playlist pública de Spotify en Inicio o en el panel <strong>Soulseek Autopilot</strong> de la barra izquierda, elige tu calidad (FLAC / Hi-Res / 320kbps) y pulsa Iniciar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

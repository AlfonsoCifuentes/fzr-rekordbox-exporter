import React, { useState } from 'react'
import type { ExportResult } from '../../../core/common/types'
import styles from './ResultsScreen.module.css'

type Props = {
  exportResults: ExportResult[]
  onBack: () => void
}

export default function ResultsScreen({ exportResults, onBack }: Props): JSX.Element {
  const [expandedUnmatched, setExpandedUnmatched] = useState<Record<number, boolean>>({})
  const totalTracks = exportResults.reduce((acc, r) => acc + r.totalTracks, 0)

  const openFolder = async (filePath: string | undefined): Promise<void> => {
    if (!filePath) return
    const folder = filePath.replace(/[\\/][^\\/]*$/, '')
    await window.electronAPI.openFolder(folder)
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className="btn-ghost" onClick={onBack}>← Nueva exportación</button>
        <h2>Exportación completada</h2>
        <span />
      </header>

      <div className={styles.content}>
        <div className={styles.successBanner}>
          <div className={styles.successIcon}>✓</div>
          <div>
            <div className={styles.successTitle}>¡Exportación finalizada con éxito!</div>
            <div className={styles.successSub}>
              {exportResults.length} playlist{exportResults.length !== 1 ? 's' : ''} ·{' '}
              {totalTracks.toLocaleString()} tracks procesados
            </div>
          </div>
        </div>

        <div className={styles.results}>
          {exportResults.map((result, i) => (
            <div key={i} className={styles.resultCard}>
              <div className={styles.resultHeader}>
                <span className={styles.resultName}>{result.playlistName}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {result.copiedFilesCount !== undefined && result.copiedFilesCount > 0 && (
                    <span className="tag tag-green">{result.copiedFilesCount} audios copiados</span>
                  )}
                  {(result.missingFilesCount ?? 0) > 0 && (
                    <span className="tag tag-amber">⚠️ {result.missingFilesCount} rutas faltantes</span>
                  )}
                  <span className={styles.resultTracks}>{result.totalTracks} tracks</span>
                </div>
              </div>

              <div className={styles.resultFiles}>
                {result.m3uPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType}>M3U8</span>
                    <span className={styles.filePath}>{result.m3uPath}</span>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => openFolder(result.m3uPath)}
                    >
                      Abrir carpeta
                    </button>
                  </div>
                )}
                {result.nmlPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType}>NML</span>
                    <span className={styles.filePath}>{result.nmlPath}</span>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => openFolder(result.nmlPath)}
                    >
                      Abrir carpeta
                    </button>
                  </div>
                )}
                {result.rekordboxXmlPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType} style={{ background: 'rgba(47,123,255,0.2)', color: '#6ba4ff' }}>RB XML</span>
                    <span className={styles.filePath}>{result.rekordboxXmlPath}</span>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => openFolder(result.rekordboxXmlPath)}
                    >
                      Abrir carpeta
                    </button>
                  </div>
                )}
                {result.setlistTxtPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType}>SETLIST</span>
                    <span className={styles.filePath}>{result.setlistTxtPath}</span>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => openFolder(result.setlistTxtPath)}
                    >
                      Abrir carpeta
                    </button>
                  </div>
                )}
                {result.cueSheetPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType} style={{ background: 'rgba(244,125,32,0.2)', color: 'var(--accent)' }}>CUE</span>
                    <span className={styles.filePath}>{result.cueSheetPath}</span>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => openFolder(result.cueSheetPath)}
                    >
                      Abrir carpeta
                    </button>
                  </div>
                )}
                {result.prepSheetHtmlPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType} style={{ background: 'rgba(0,149,255,0.2)', color: '#6cc2ff' }}>HTML PREP</span>
                    <span className={styles.filePath}>{result.prepSheetHtmlPath}</span>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => openFolder(result.prepSheetHtmlPath)}
                    >
                      Abrir carpeta
                    </button>
                  </div>
                )}
                {result.streamingCsvPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType} style={{ background: '#1db95420', color: '#1db954' }}>STREAM</span>
                    <span className={styles.filePath}>{result.streamingCsvPath}</span>
                  </div>
                )}
                {result.reportJsonPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType}>JSON</span>
                    <span className={styles.filePath}>{result.reportJsonPath}</span>
                  </div>
                )}
                {result.reportCsvPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType}>CSV</span>
                    <span className={styles.filePath}>{result.reportCsvPath}</span>
                  </div>
                )}
                {result.spotifyTxtPath && (
                  <div className={styles.fileRow}>
                    <span className={styles.fileType} style={{ background: '#1db95420', color: '#1db954' }}>TXT</span>
                    <span className={styles.filePath}>{result.spotifyTxtPath}</span>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => openFolder(result.spotifyTxtPath)}
                    >
                      Abrir carpeta
                    </button>
                  </div>
                )}
                {result.spotifyPlaylistUrl && (
                  <div className={styles.fileRow} style={{ background: 'rgba(29, 185, 84, 0.08)', padding: '10px 16px' }}>
                    <span className={styles.fileType} style={{ background: '#1db95425', color: '#1db954' }}>Spotify</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--text)' }}>{result.spotifyMatched ?? 0}</strong> canciones añadidas
                      {result.spotifyPublic ? ' · Pública' : ' · Privada'}
                      {(result.spotifyNotFound ?? 0) > 0 && ` · ${result.spotifyNotFound} no encontradas`}
                    </span>
                    {result.spotifyUnmatchedTracks && result.spotifyUnmatchedTracks.length > 0 && (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '3px 8px' }}
                        onClick={() =>
                          setExpandedUnmatched((prev) => ({ ...prev, [i]: !prev[i] }))
                        }
                      >
                        {expandedUnmatched[i] ? 'Ocultar faltantes' : 'Ver faltantes'}
                      </button>
                    )}
                    <button
                      className="btn-green"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => window.electronAPI.openExternal(result.spotifyPlaylistUrl!)}
                    >
                      Abrir en Spotify →
                    </button>
                  </div>
                )}

                {expandedUnmatched[i] &&
                  result.spotifyUnmatchedTracks &&
                  result.spotifyUnmatchedTracks.length > 0 && (
                    <div style={{ padding: '10px 16px', background: 'var(--bg)', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--amber)' }}>
                        Tracks no añadidos a Spotify ({result.spotifyUnmatchedTracks.length}):
                      </div>
                      <ul style={{ paddingLeft: 18, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                        {result.spotifyUnmatchedTracks.map((t, ti) => (
                          <li key={ti}>{t.artist} — {t.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.hint}>
          <strong>Importar en Traktor:</strong> En Traktor Pro, ve a{' '}
          <em>File → Import → Import Playlist...</em> y selecciona el archivo <code>.nml</code> o <code>.m3u8</code>.{' '}
          <strong>Para Spotify con .txt:</strong> Usa{' '}
          <a
            href="https://soundiiz.com"
            style={{ color: 'var(--accent)' }}
            onClick={(e) => {
              e.preventDefault()
              window.electronAPI.openExternal('https://soundiiz.com')
            }}
          >
            Soundiiz
          </a>{' '}o{' '}
          <a
            href="https://www.tunemymusic.com"
            style={{ color: 'var(--accent)' }}
            onClick={(e) => {
              e.preventDefault()
              window.electronAPI.openExternal('https://www.tunemymusic.com')
            }}
          >
            TuneMyMusic
          </a>.
        </div>
      </div>
    </div>
  )
}

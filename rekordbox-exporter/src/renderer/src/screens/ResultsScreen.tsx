import React from 'react'
import type { ExportResult } from '../../../core/common/types'
import styles from './ResultsScreen.module.css'

type Props = {
  exportResults: ExportResult[]
  onBack: () => void
}

export default function ResultsScreen({ exportResults, onBack }: Props): JSX.Element {
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
            <div className={styles.successTitle}>¡Exportación finalizada!</div>
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
                <span className={styles.resultTracks}>{result.totalTracks} tracks</span>
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
                    <span className={styles.fileType} style={{ background: '#1db95420', color: '#1db954', borderColor: '#1db95440' }}>TXT</span>
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
                  <div className={styles.fileRow} style={{ background: '#1db95410', borderColor: '#1db95440', borderRadius: 6, padding: '10px 14px' }}>
                    <span className={styles.fileType} style={{ background: '#1db95420', color: '#1db954', borderColor: '#1db95440' }}>Spotify</span>
                    <span style={{ flex: 1, fontSize: 12, color: '#aaa' }}>
                      {result.spotifyMatched ?? 0} canciones añadidas
                      {(result.spotifyNotFound ?? 0) > 0 && ` · ${result.spotifyNotFound} no encontradas`}
                    </span>
                    <a
                      href={result.spotifyPlaylistUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 10px', color: '#1db954', textDecoration: 'none' }}
                      onClick={(e) => {
                        e.preventDefault()
                        window.open(result.spotifyPlaylistUrl, '_blank')
                      }}
                    >
                      Abrir en Spotify →
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.hint}>
          <strong>Importar en Traktor:</strong> En Traktor, ve a{' '}
          <em>File → Import → Import Playlist...</em> y selecciona el archivo .nml o .m3u8.
          {' '}
          <strong>Para Spotify con el .txt:</strong> Ve a{' '}
          <a href="https://soundiiz.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}
            onClick={(e) => { e.preventDefault(); window.open('https://soundiiz.com', '_blank') }}>
            Soundiiz
          </a>{' '}o{' '}
          <a href="https://www.tunemymusic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}
            onClick={(e) => { e.preventDefault(); window.open('https://www.tunemymusic.com', '_blank') }}>
            TuneMyMusic
          </a>{' '}e importa el archivo .txt.
        </div>
      </div>
    </div>
  )
}

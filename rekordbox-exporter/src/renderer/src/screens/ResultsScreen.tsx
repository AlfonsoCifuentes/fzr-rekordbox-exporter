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
              </div>
            </div>
          ))}
        </div>

        <div className={styles.hint}>
          <strong>Importar en Traktor:</strong> En Traktor, ve a{' '}
          <em>File → Import → Import Playlist...</em> y selecciona el archivo .nml o .m3u8.
        </div>
      </div>
    </div>
  )
}

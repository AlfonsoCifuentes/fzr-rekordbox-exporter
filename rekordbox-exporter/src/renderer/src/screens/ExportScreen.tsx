import React, { useState } from 'react'
import type { Playlist, ExportResult } from '../../../core/common/types'
import styles from './ExportScreen.module.css'

type Props = {
  selectedPlaylists: Playlist[]
  onExportDone: (results: ExportResult[]) => void
  onBack: () => void
}

export default function ExportScreen({ selectedPlaylists, onExportDone, onBack }: Props): JSX.Element {
  const [exportM3U8, setExportM3U8] = useState(true)
  const [exportNml, setExportNml] = useState(true)
  const [outputDir, setOutputDir] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalTracks = selectedPlaylists.reduce((acc, p) => acc + p.tracks.length, 0)

  const handleChooseDir = async (): Promise<void> => {
    const dir = await window.electronAPI.openOutputDir()
    if (dir) setOutputDir(dir)
  }

  const handleExport = async (): Promise<void> => {
    if (!outputDir) return
    setExporting(true)
    setError(null)
    try {
      const results = await window.electronAPI.exportPlaylists(selectedPlaylists, {
        outputDir,
        exportM3U8,
        exportNml
      })
      onExportDone(results)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const canExport = outputDir && (exportM3U8 || exportNml) && !exporting

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

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Formatos de exportación</h3>
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

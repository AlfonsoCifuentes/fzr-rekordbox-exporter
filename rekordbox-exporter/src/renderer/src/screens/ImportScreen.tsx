import React from 'react'
import type { ParseResult } from '../../../core/common/types'
import styles from './ImportScreen.module.css'

type Props = {
  filePath: string
  parseResult: ParseResult
  onContinue: () => void
  onBack: () => void
}

export default function ImportScreen({ filePath, parseResult, onContinue, onBack }: Props): JSX.Element {
  const { tracks, playlists, warnings } = parseResult
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const formatLabels: Record<string, string> = {
    xml: 'Rekordbox XML',
    m3u8: 'Playlist M3U8',
    m3u: 'Playlist M3U',
    txt: 'Texto Rekordbox (TXT)'
  }
  const formatLabel = formatLabels[ext] ?? ext.toUpperCase()

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className="btn-ghost" onClick={onBack}>← Atrás</button>
        <h2>Archivo importado</h2>
        <span />
      </header>

      <div className={styles.content}>
        <div className={styles.fileCard}>
          <div className={styles.fileIcon}>📄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.fileName}>
              {fileName}
              <span className={styles.formatBadge}>{formatLabel}</span>
            </div>
            <div className={styles.filePath}>{filePath}</div>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{tracks.length.toLocaleString()}</span>
            <span className={styles.statLabel}>Tracks en colección</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{playlists.length.toLocaleString()}</span>
            <span className={styles.statLabel}>Playlists encontradas</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber} style={{ color: warnings.length > 0 ? 'var(--amber)' : 'var(--green)' }}>
              {warnings.length}
            </span>
            <span className={styles.statLabel}>Avisos</span>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className={styles.warnings}>
            <h3 className={styles.warningsTitle}>⚠️ Avisos del parser</h3>
            <div className={styles.warningsList}>
              {warnings.slice(0, 20).map((w, i) => (
                <div key={i} className={styles.warningItem}>{w}</div>
              ))}
              {warnings.length > 20 && (
                <div className={styles.warningMore}>... y {warnings.length - 20} avisos más</div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <button className="btn-primary" onClick={onContinue} disabled={playlists.length === 0}>
          Seleccionar playlists →
        </button>
      </footer>
    </div>
  )
}

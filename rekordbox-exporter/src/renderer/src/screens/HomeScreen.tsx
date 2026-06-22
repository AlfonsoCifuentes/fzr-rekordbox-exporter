import React from 'react'
import styles from './HomeScreen.module.css'

type Props = {
  onOpenFile: () => void
}

export default function HomeScreen({ onOpenFile }: Props): JSX.Element {
  return (
    <div className={styles.root}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>▶</div>
        <h1 className={styles.title}>Rekordbox Exporter</h1>
        <p className={styles.subtitle}>
          Exporta tus playlists de Rekordbox a Spotify y Traktor
        </p>
      </div>

      <div className={styles.actions}>
        <button className="btn-primary" style={{ fontSize: 16, padding: '14px 32px' }} onClick={onOpenFile}>
          Importar exportación de Rekordbox
        </button>
      </div>

      <div className={styles.formats}>
        <span className={styles.formatsLabel}>Formatos soportados:</span>
        <span className={styles.formatBadge}>.xml</span>
        <span className={styles.formatBadge}>.m3u8</span>
        <span className={styles.formatBadge}>.m3u</span>
        <span className={styles.formatBadge}>.txt</span>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>📂</div>
          <div>
            <strong>Parser Rekordbox</strong>
            <p>Lee colecciones y playlists desde XML, M3U8/M3U y TXT exportados de Rekordbox</p>
          </div>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🎵</div>
          <div>
            <strong>Exportación M3U8</strong>
            <p>Genera playlists .m3u8 compatibles con Traktor y reproductores DJ</p>
          </div>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🎛️</div>
          <div>
            <strong>Exportación NML</strong>
            <p>Crea archivos .nml importables directamente en Traktor</p>
          </div>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>📊</div>
          <div>
            <strong>Informes CSV/JSON</strong>
            <p>Genera informes detallados con el estado de cada track</p>
          </div>
        </div>
      </div>

      <div className={styles.hints}>
        <p><strong>XML:</strong> <em>File → Export Collection in rekordbox xml format</em></p>
        <p><strong>M3U8/TXT:</strong> Click derecho en playlist → <em>Export Playlist</em> → elige formato</p>
      </div>
    </div>
  )
}

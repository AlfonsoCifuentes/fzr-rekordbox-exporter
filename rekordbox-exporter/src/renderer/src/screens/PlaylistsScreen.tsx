import React, { useState, useMemo } from 'react'
import type { Playlist } from '../../../core/common/types'
import styles from './PlaylistsScreen.module.css'

type Props = {
  playlists: Playlist[]
  selectedPlaylists: Playlist[]
  onSelectionChange: (playlists: Playlist[]) => void
  onContinue: () => void
  onBack: () => void
}

export default function PlaylistsScreen({
  playlists,
  selectedPlaylists,
  onSelectionChange,
  onContinue,
  onBack
}: Props): JSX.Element {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim()
    if (!q) return playlists
    return playlists.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path.join(' / ').toLowerCase().includes(q)
    )
  }, [playlists, filter])

  const selectedIds = useMemo(() => new Set(selectedPlaylists.map((p) => p.id)), [selectedPlaylists])

  const togglePlaylist = (playlist: Playlist): void => {
    if (selectedIds.has(playlist.id)) {
      onSelectionChange(selectedPlaylists.filter((p) => p.id !== playlist.id))
    } else {
      onSelectionChange([...selectedPlaylists, playlist])
    }
  }

  const toggleAll = (): void => {
    if (selectedPlaylists.length === filtered.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(filtered)
    }
  }

  const totalTracks = useMemo(
    () => selectedPlaylists.reduce((acc, p) => acc + p.tracks.length, 0),
    [selectedPlaylists]
  )

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className="btn-ghost" onClick={onBack}>← Atrás</button>
        <h2>Seleccionar playlists</h2>
        <span className={styles.headerInfo}>
          {selectedPlaylists.length} seleccionadas · {totalTracks} tracks
        </span>
      </header>

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Filtrar playlists..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.searchInput}
        />
        <button className="btn-ghost" onClick={toggleAll} style={{ whiteSpace: 'nowrap' }}>
          {selectedPlaylists.length === filtered.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Playlist</th>
              <th>Carpeta</th>
              <th style={{ textAlign: 'right', width: 80 }}>Tracks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((playlist) => {
              const selected = selectedIds.has(playlist.id)
              const folder = playlist.path.slice(0, -1).join(' / ')
              return (
                <tr
                  key={playlist.id}
                  className={selected ? styles.rowSelected : styles.row}
                  onClick={() => togglePlaylist(playlist)}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePlaylist(playlist)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className={styles.playlistName}>{playlist.name}</td>
                  <td className={styles.folderPath}>{folder || '—'}</td>
                  <td className={styles.trackCount}>{playlist.tracks.length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className={styles.empty}>No se encontraron playlists</div>
        )}
      </div>

      <footer className={styles.footer}>
        <button
          className="btn-primary"
          onClick={onContinue}
          disabled={selectedPlaylists.length === 0}
        >
          Exportar {selectedPlaylists.length > 0 ? `(${selectedPlaylists.length})` : ''} →
        </button>
      </footer>
    </div>
  )
}

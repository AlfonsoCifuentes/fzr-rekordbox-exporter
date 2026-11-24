import React, { useState, useMemo, useEffect } from 'react'
import type { Playlist } from '../../../core/common/types'
import {
  analyzePlaylist,
  sortPlaylistHarmonically,
  deduplicatePlaylist,
  normalizeToCamelot
} from '../../../core/analytics/analyzePlaylist'
import {
  mergePlaylists,
  diffPlaylists,
  splitPlaylistByBpm,
  splitPlaylistByGenre,
  type PlaylistDiff
} from '../../../core/analytics/playlistTools'
import { remapPlaylistPaths } from '../../../core/export/extraExporters'
import { cleanPlaylistMetadata, fixHalfDoubleBpm } from '../../../core/analytics/cleanMetadata'
import { getCamelotPillStyle } from '../components/StudioIcons'
import CamelotWheel from '../components/CamelotWheel'
import styles from './PlaylistsScreen.module.css'

type Props = {
  playlists: Playlist[]
  selectedPlaylists: Playlist[]
  onPlaylistsMutated: (all: Playlist[], selected: Playlist[]) => void
  onSelectionChange: (playlists: Playlist[]) => void
  onContinue: () => void
  onBack: () => void
}

function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || isNaN(seconds)) return '—'
  const h = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function BpmCurveChart({ playlist }: { playlist: Playlist }): JSX.Element | null {
  const points = playlist.tracks
    .map((t, idx) => ({ idx, bpm: t.bpm }))
    .filter((p): p is { idx: number; bpm: number } => Boolean(p.bpm && p.bpm > 0))

  if (points.length < 2) return null

  const minBpm = Math.min(...points.map((p) => p.bpm))
  const maxBpm = Math.max(...points.map((p) => p.bpm))
  const span = Math.max(4, maxBpm - minBpm)
  const W = 400
  const H = 86
  const padX = 10
  const padY = 12

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (W - padX * 2)
    const y = H - padY - ((p.bpm - minBpm) / span) * (H - padY * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const areaPoints = `${padX},${H - padY} ${coords.join(' ')} ${W - padX},${H - padY}`

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
        <strong style={{ color: 'var(--text)' }}>Curva de energía / BPM del set</strong>
        <span>{Math.round(minBpm)} – {Math.round(maxBpm)} BPM</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 86, display: 'block' }}>
        <defs>
          <linearGradient id="bpmFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1db954" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1db954" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#bpmFill)" />
        <polyline
          fill="none"
          stroke="#1db954"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={coords.join(' ')}
        />
      </svg>
    </div>
  )
}

export default function PlaylistsScreen({
  playlists,
  selectedPlaylists,
  onPlaylistsMutated,
  onSelectionChange,
  onContinue,
  onBack
}: Props): JSX.Element {
  const [filter, setFilter] = useState('')
  const [previewPlaylistId, setPreviewPlaylistId] = useState<string | null>(
    playlists[0]?.id ?? null
  )
  const [previewTab, setPreviewTab] = useState<'tracks' | 'analytics'>('tracks')
  const [fileStatus, setFileStatus] = useState<Record<string, boolean>>({})
  const [statusToast, setStatusToast] = useState<string | null>(null)
  const [relocating, setRelocating] = useState(false)

  // Path remapper state
  const [showRemapper, setShowRemapper] = useState(false)
  const [remapFrom, setRemapFrom] = useState('')
  const [remapTo, setRemapTo] = useState('')

  // Playlist Diff modal state
  const [diffResult, setDiffResult] = useState<PlaylistDiff | null>(null)

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim()
    if (!q) return playlists
    return playlists.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path.join(' / ').toLowerCase().includes(q)
    )
  }, [playlists, filter])

  const selectedIds = useMemo(
    () => new Set(selectedPlaylists.map((p) => p.id)),
    [selectedPlaylists]
  )

  const previewPlaylist = useMemo(
    () => playlists.find((p) => p.id === previewPlaylistId) ?? filtered[0] ?? null,
    [playlists, filtered, previewPlaylistId]
  )

  const analytics = useMemo(
    () => (previewPlaylist ? analyzePlaylist(previewPlaylist) : null),
    [previewPlaylist]
  )

  useEffect(() => {
    if (!previewPlaylist) return
    const paths = previewPlaylist.tracks
      .map((t) => t.location)
      .filter((p): p is string => typeof p === 'string' && p.length > 0 && !(p in fileStatus))
    if (paths.length === 0) return

    window.electronAPI
      .checkFilesExist(paths)
      .then((res) => setFileStatus((prev) => ({ ...prev, ...res })))
      .catch(() => {})
  }, [previewPlaylist])

  const notify = (msg: string): void => {
    setStatusToast(msg)
    setTimeout(() => setStatusToast(null), 4500)
  }

  const togglePlaylist = (playlist: Playlist): void => {
    if (selectedIds.has(playlist.id)) {
      onSelectionChange(selectedPlaylists.filter((p) => p.id !== playlist.id))
    } else {
      onSelectionChange([...selectedPlaylists, playlist])
    }
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))

  const toggleAll = (): void => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filtered.map((p) => p.id))
      onSelectionChange(selectedPlaylists.filter((p) => !filteredIds.has(p.id)))
    } else {
      const next = [...selectedPlaylists]
      for (const p of filtered) {
        if (!selectedIds.has(p.id)) next.push(p)
      }
      onSelectionChange(next)
    }
  }

  const replacePlaylist = (updated: Playlist): void => {
    const nextAll = playlists.map((p) => (p.id === updated.id ? updated : p))
    const nextSel = selectedPlaylists.map((p) => (p.id === updated.id ? updated : p))
    onPlaylistsMutated(nextAll, nextSel)
  }

  const handleMoveTrack = (idx: number, direction: -1 | 1): void => {
    if (!previewPlaylist) return
    const target = idx + direction
    if (target < 0 || target >= previewPlaylist.tracks.length) return
    const tracks = [...previewPlaylist.tracks]
    const [moved] = tracks.splice(idx, 1)
    tracks.splice(target, 0, moved)
    replacePlaylist({ ...previewPlaylist, tracks })
  }

  const handleRemoveTrack = (idx: number): void => {
    if (!previewPlaylist) return
    const tracks = previewPlaylist.tracks.filter((_, i) => i !== idx)
    replacePlaylist({ ...previewPlaylist, tracks })
  }

  const handleHarmonicSort = (): void => {
    if (!previewPlaylist) return
    const sorted = sortPlaylistHarmonically(previewPlaylist)
    replacePlaylist(sorted)
    const nextStats = analyzePlaylist(sorted)
    notify(
      `Playlist "${sorted.name}" ordenada armónicamente${nextStats.harmonicScore !== null ? ` (${nextStats.harmonicScore}% compatibilidad Camelot)` : ''}`
    )
  }

  const handleDeduplicate = (): void => {
    if (!previewPlaylist) return
    const { playlist: cleaned, removedCount } = deduplicatePlaylist(previewPlaylist)
    if (removedCount === 0) return
    replacePlaylist(cleaned)
    notify(`Se eliminaron ${removedCount} pista(s) duplicada(s) de "${cleaned.name}"`)
  }

  const handleCleanMetadata = (): void => {
    if (!previewPlaylist) return
    const rep = cleanPlaylistMetadata(previewPlaylist)
    if (rep.tracksCleaned === 0) {
      notify('Los metadatos y tonalidades Camelot de esta playlist ya están limpios')
      return
    }
    replacePlaylist(rep.playlist)
    notify(
      `✓ ${rep.tracksCleaned} pista(s) limpiadas (${rep.keysNormalized} keys → Camelot, ${rep.artistsExtracted} artistas extraídos)`
    )
  }

  const handleFixHalfDoubleBpm = (): void => {
    if (!previewPlaylist) return
    const rep = fixHalfDoubleBpm(previewPlaylist)
    if (rep.fixedCount === 0) {
      notify('No se detectaron pistas con BPM a mitad o doble respecto a la mediana del set')
      return
    }
    replacePlaylist(rep.playlist)
    notify(`✓ ${rep.fixedCount} pista(s) corregidas (BPM ×2/÷2 ajustado a mediana ${rep.medianBpm} BPM)`)
  }

  const handleMergeSelected = (): void => {
    if (selectedPlaylists.length < 2) return
    const mergedName = `Merged (${selectedPlaylists.length} playlists)`
    const merged = mergePlaylists(selectedPlaylists, mergedName, true)
    const nextAll = [merged, ...playlists]
    onPlaylistsMutated(nextAll, [merged])
    setPreviewPlaylistId(merged.id)
    notify(`✓ Creada playlist fusionada "${merged.name}" con ${merged.tracks.length} tracks únicos`)
  }

  const handleCompareTwo = (): void => {
    if (selectedPlaylists.length !== 2) return
    setDiffResult(diffPlaylists(selectedPlaylists[0], selectedPlaylists[1]))
  }

  const handleSplitByBpm = (): void => {
    if (!previewPlaylist) return
    const parts = splitPlaylistByBpm(previewPlaylist)
    if (parts.length <= 1) {
      notify('Esta playlist no tiene variedad suficiente de BPM para dividirse en zonas')
      return
    }
    const nextAll = [...parts, ...playlists]
    onPlaylistsMutated(nextAll, [...selectedPlaylists, ...parts])
    setPreviewPlaylistId(parts[0].id)
    notify(`✓ Dividida en ${parts.length} playlists por zona BPM`)
  }

  const handleSplitByGenre = (): void => {
    if (!previewPlaylist) return
    const parts = splitPlaylistByGenre(previewPlaylist)
    if (parts.length <= 1) {
      notify('Todas las pistas comparten el mismo género (o no tienen género)')
      return
    }
    const nextAll = [...parts, ...playlists]
    onPlaylistsMutated(nextAll, [...selectedPlaylists, ...parts])
    setPreviewPlaylistId(parts[0].id)
    notify(`✓ Dividida en ${parts.length} playlists por género`)
  }

  const handleApplyRemap = (): void => {
    if (!remapFrom.trim()) return
    const { playlists: remappedAll, remappedCount } = remapPlaylistPaths(
      playlists,
      remapFrom.trim(),
      remapTo.trim()
    )
    if (remappedCount === 0) {
      notify('No se encontró ninguna ruta que empezara por ese prefijo')
      return
    }
    const selIdSet = new Set(selectedPlaylists.map((p) => p.id))
    const remappedSel = remappedAll.filter((p) => selIdSet.has(p.id))
    onPlaylistsMutated(remappedAll, remappedSel)
    setFileStatus({})
    setShowRemapper(false)
    notify(`✓ ${remappedCount} rutas de archivo remapeadas correctamente`)
  }

  const handleAutoRelocate = async (): Promise<void> => {
    setRelocating(true)
    try {
      const res = await window.electronAPI.autoRelocate(playlists)
      if (!res) return
      if (res.relocatedCount === 0) {
        notify(`Se escanearon ${res.scannedCount.toLocaleString()} audios en "${res.rootDir}", sin pistas nuevas por reparar`)
        return
      }
      const selIdSet = new Set(selectedPlaylists.map((p) => p.id))
      const nextSel = res.playlists.filter((p) => selIdSet.has(p.id))
      onPlaylistsMutated(res.playlists, nextSel)
      setFileStatus({})
      notify(`✓ ¡${res.relocatedCount} rutas reparadas automáticamente! (${res.scannedCount.toLocaleString()} audios analizados)`)
    } finally {
      setRelocating(false)
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
        <h2>Seleccionar y analizar playlists</h2>
        <span className={styles.headerInfo}>
          {selectedPlaylists.length} seleccionadas · {totalTracks.toLocaleString()} tracks
        </span>
      </header>

      <div className={styles.toolbar} style={{ flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Filtrar por nombre o carpeta..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.searchInput}
        />
        <button className="btn-ghost" onClick={toggleAll} style={{ whiteSpace: 'nowrap' }}>
          {allFilteredSelected ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
        </button>

        {selectedPlaylists.length >= 2 && (
          <button
            className="btn-secondary"
            onClick={handleMergeSelected}
            style={{ whiteSpace: 'nowrap', color: 'var(--green)' }}
            title="Combina las playlists seleccionadas en una sola eliminando duplicados"
          >
            🔗 Fusionar ({selectedPlaylists.length})
          </button>
        )}

        {selectedPlaylists.length === 2 && (
          <button
            className="btn-secondary"
            onClick={handleCompareTwo}
            style={{ whiteSpace: 'nowrap' }}
            title="Compara las 2 playlists seleccionadas para ver diferencias y temas comunes"
          >
            ⚖️ Comparar (Diff)
          </button>
        )}

        <button
          className="btn-secondary"
          onClick={() => setShowRemapper((v) => !v)}
          style={{ whiteSpace: 'nowrap', marginLeft: 'auto' }}
          title="Reemplaza prefijos rotos o escanea una carpeta local para relocalizar pistas"
        >
          🔧 Reparar rutas
        </button>
      </div>

      {showRemapper && (
        <div
          style={{
            padding: '12px 24px',
            background: '#161b26',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prefijo:</span>
          <input
            type="text"
            placeholder="Ej: /Volumes/USB  o  C:/Music"
            value={remapFrom}
            onChange={(e) => setRemapFrom(e.target.value)}
            style={{ flex: 1, minWidth: 160, fontFamily: 'monospace' }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</span>
          <input
            type="text"
            placeholder="Ej: D:/DJ_Library"
            value={remapTo}
            onChange={(e) => setRemapTo(e.target.value)}
            style={{ flex: 1, minWidth: 160, fontFamily: 'monospace' }}
          />
          <button className="btn-primary" onClick={handleApplyRemap}>
            Aplicar prefijo
          </button>
          <button
            className="btn-green"
            onClick={handleAutoRelocate}
            disabled={relocating}
            title="Escanea una carpeta de tu PC y repara automáticamente las pistas faltantes por nombre"
          >
            {relocating ? 'Escaneando...' : '🔍 Auto-buscar en carpeta'}
          </button>
          <button className="btn-ghost" onClick={() => setShowRemapper(false)}>
            ✕
          </button>
        </div>
      )}

      {statusToast && (
        <div
          style={{
            padding: '8px 24px',
            background: 'rgba(29, 185, 84, 0.14)',
            borderBottom: '1px solid rgba(29, 185, 84, 0.35)',
            color: '#6ff09d',
            fontSize: 12,
            fontWeight: 500
          }}
        >
          {statusToast}
        </div>
      )}

      <div className={styles.splitPane}>
        {/* Left: Playlists table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 38 }}></th>
                <th>Playlist</th>
                <th>Carpeta</th>
                <th style={{ textAlign: 'right', width: 70 }}>Tracks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((playlist) => {
                const selected = selectedIds.has(playlist.id)
                const isPreview = previewPlaylist?.id === playlist.id
                const folder = playlist.path
                  .slice(0, -1)
                  .filter((seg) => seg.toUpperCase() !== 'ROOT')
                  .join(' / ')
                return (
                  <tr
                    key={playlist.id}
                    className={`${selected ? styles.rowSelected : styles.row} ${isPreview ? styles.rowActive : ''}`}
                    onClick={() => setPreviewPlaylistId(playlist.id)}
                    onDoubleClick={() => togglePlaylist(playlist)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => togglePlaylist(playlist)}
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
            <div className={styles.empty}>No se encontraron playlists con ese filtro</div>
          )}
        </div>

        {/* Right: Track preview + DJ Set Analytics pane */}
        <aside className={styles.previewPane}>
          {previewPlaylist && analytics ? (
            <>
              <div className={styles.previewHeader}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.previewTitle}>{previewPlaylist.name}</div>
                  <div className={styles.previewSub}>
                    {previewPlaylist.tracks.length} tracks · {formatDuration(analytics.totalDurationSeconds)}
                    {analytics.bpmMin !== undefined && ` · ${analytics.bpmMin}–${analytics.bpmMax} BPM`}
                    {analytics.harmonicScore !== null && ` · 🎹 ${analytics.harmonicScore}% armónico`}
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: '5px 9px', flexShrink: 0 }}
                  onClick={() => togglePlaylist(previewPlaylist)}
                >
                  {selectedIds.has(previewPlaylist.id) ? '✓ Elegida' : '+ Elegir'}
                </button>
              </div>

              {/* Sub-tabs + quick DJ tools */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  padding: '8px 14px',
                  background: 'var(--bg2)',
                  borderBottom: '1px solid var(--border)',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    className={previewTab === 'tracks' ? 'btn-primary' : 'btn-ghost'}
                    style={{ fontSize: 11, padding: '4px 9px' }}
                    onClick={() => setPreviewTab('tracks')}
                  >
                    Pistas ({previewPlaylist.tracks.length})
                  </button>
                  <button
                    className={previewTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}
                    style={{ fontSize: 11, padding: '4px 9px' }}
                    onClick={() => setPreviewTab('analytics')}
                  >
                    Análisis DJ {analytics.duplicates.length > 0 ? `(${analytics.duplicates.length} dup)` : ''}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '4px 8px', color: 'var(--green)' }}
                    onClick={handleHarmonicSort}
                    title="Ordena las pistas maximizando compatibilidad Camelot y progresión suave de BPM"
                  >
                    ✨ Camelot
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '4px 8px', color: '#6cc2ff' }}
                    onClick={handleCleanMetadata}
                    title="Limpia [FREE DOWNLOAD], (320kbps), extrae Artista - Título y normaliza tonalidades a Camelot"
                  >
                    🧼 Limpiar tags
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={handleFixHalfDoubleBpm}
                    title="Corrige pistas analizadas a mitad o doble BPM respecto al set"
                  >
                    ⚡ BPM ×2/÷2
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={handleSplitByBpm}
                    title="Divide en sub-playlists por zonas BPM (Warm-Up, Groove, Peak Time, Hard)"
                  >
                    ✂️ Zonas BPM
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={handleSplitByGenre}
                    title="Divide en sub-playlists agrupadas por género"
                  >
                    🏷️ Géneros
                  </button>
                  {analytics.duplicates.length > 0 && (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '4px 8px', color: 'var(--amber)' }}
                      onClick={handleDeduplicate}
                    >
                      🧹 Duplicados
                    </button>
                  )}
                </div>
              </div>

              {previewTab === 'tracks' ? (
                <div className={styles.trackList}>
                  {previewPlaylist.tracks.map((track, idx) => {
                    const hasPath = Boolean(track.location)
                    const exists = track.location ? fileStatus[track.location] : false
                    const cam = normalizeToCamelot(track.key)?.code ?? track.key
                    const transition = idx > 0 ? analytics.transitions[idx - 1] : null

                    return (
                      <div key={`${track.internalId}-${idx}`} className={styles.trackItem}>
                        <span className={styles.trackNum}>{idx + 1}</span>
                        <div className={styles.trackMain}>
                          <div className={styles.trackTitle}>{track.name}</div>
                          <div className={styles.trackArtist}>
                            <span>{track.artist}</span>
                            {track.bpm ? (
                              <span style={{ fontFamily: 'monospace', color: '#9ab4d6' }}>
                                {Math.round(track.bpm)} BPM
                              </span>
                            ) : null}
                            {cam ? (
                              <span style={getCamelotPillStyle(cam)}>{cam}</span>
                            ) : null}
                            {track.cuePoints && track.cuePoints.length > 0 ? (
                              <span style={{ color: '#ffab5e', fontFamily: 'monospace' }}>
                                {track.cuePoints.length} cues
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {transition && transition.rating !== 'unknown' && (
                          <span
                            className={`tag ${
                              transition.rating === 'perfect'
                                ? 'tag-green'
                                : transition.rating === 'energy'
                                  ? 'tag-amber'
                                  : 'tag-red'
                            }`}
                            title={`Transición ${transition.fromKey ?? '?'} → ${transition.toKey ?? '?'}${
                              transition.bpmDelta !== undefined
                                ? ` (${transition.bpmDelta > 0 ? '+' : ''}${transition.bpmDelta} BPM)`
                                : ''
                            }`}
                          >
                            {transition.rating === 'perfect'
                              ? '✓'
                              : transition.rating === 'energy'
                                ? '⚡'
                                : '⚠'}
                          </span>
                        )}
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button
                            className="btn-ghost"
                            style={{ fontSize: 10, padding: '2px 5px' }}
                            disabled={idx === 0}
                            onClick={() => handleMoveTrack(idx, -1)}
                            title="Subir pista"
                          >
                            ↑
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ fontSize: 10, padding: '2px 5px' }}
                            disabled={idx === previewPlaylist.tracks.length - 1}
                            onClick={() => handleMoveTrack(idx, 1)}
                            title="Bajar pista"
                          >
                            ↓
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ fontSize: 10, padding: '2px 5px', color: '#ff8a80' }}
                            onClick={() => handleRemoveTrack(idx)}
                            title="Quitar pista de esta exportación"
                          >
                            ✕
                          </button>
                        </div>
                        <span className={styles.trackDur}>{formatDuration(track.durationSeconds)}</span>
                        <span
                          className={styles.fileDot}
                          title={
                            !hasPath
                              ? 'Sin ruta de archivo'
                              : exists === false
                                ? `No encontrado en disco: ${track.location}`
                                : exists === true
                                  ? `Archivo verificado: ${track.location}`
                                  : track.location
                          }
                          style={{
                            background: !hasPath
                              ? 'var(--red)'
                              : exists === false
                                ? 'var(--amber)'
                                : exists === true
                                  ? 'var(--green)'
                                  : 'var(--border)'
                          }}
                        />
                      </div>
                    )
                  })}
                  {previewPlaylist.tracks.length === 0 && (
                    <div className={styles.empty}>Esta playlist está vacía</div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rango BPM</div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                        {analytics.bpmMin !== undefined ? `${analytics.bpmMin} – ${analytics.bpmMax}` : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Media: {analytics.bpmAvg ?? '—'} · Mediana: {analytics.bpmMedian ?? '—'}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Flujo armónico Camelot</div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          marginTop: 2,
                          color:
                            analytics.harmonicScore === null
                              ? 'var(--text-muted)'
                              : analytics.harmonicScore >= 75
                                ? 'var(--green)'
                                : analytics.harmonicScore >= 50
                                  ? 'var(--amber)'
                                  : 'var(--red)'
                        }}
                      >
                        {analytics.harmonicScore !== null ? `${analytics.harmonicScore}%` : 'Sin tonalidades'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        ✓ {analytics.compatibleTransitions} · ⚡ {analytics.energyTransitions} · ⚠ {analytics.clashTransitions}
                      </div>
                    </div>
                  </div>

                  {/* Visual BPM Curve Chart */}
                  <BpmCurveChart playlist={previewPlaylist} />

                  {/* Library health */}
                  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Salud de metadatos</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span className="tag tag-muted">Hot Cues: {analytics.totalCuePoints}</span>
                      <span className={`tag ${analytics.missingBpmCount > 0 ? 'tag-amber' : 'tag-green'}`}>
                        Sin BPM: {analytics.missingBpmCount}
                      </span>
                      <span className={`tag ${analytics.missingKeyCount > 0 ? 'tag-amber' : 'tag-green'}`}>
                        Sin Key: {analytics.missingKeyCount}
                      </span>
                      <span className={`tag ${analytics.missingLocationCount > 0 ? 'tag-red' : 'tag-green'}`}>
                        Sin ruta: {analytics.missingLocationCount}
                      </span>
                    </div>
                  </div>

                  {/* Top Camelot keys + Interactive Camelot Wheel */}
                  {analytics.keyDistribution.length > 0 && (
                    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 10 }}>Rueda Armónica Camelot</div>
                      <CamelotWheel keyDistribution={analytics.keyDistribution} size={200} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                        {analytics.keyDistribution.slice(0, 12).map((k) => (
                          <span key={k.key} style={getCamelotPillStyle(k.key)}>
                            {k.key} ({k.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duplicates */}
                  {analytics.duplicates.length > 0 && (
                    <div style={{ background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.35)', borderRadius: 8, padding: 12, fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: 'var(--amber)', marginBottom: 6 }}>
                        ⚠️ {analytics.duplicates.length} duplicado(s) detectado(s)
                      </div>
                      {analytics.duplicates.map((d) => (
                        <div key={d.signature} style={{ color: 'var(--text-muted)', marginBottom: 3 }}>
                          • {d.label} (posiciones {d.indices.map((i) => i + 1).join(', ')})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={styles.empty}>Selecciona una playlist para ver sus pistas y análisis</div>
          )}
        </aside>
      </div>

      {/* Diff Modal */}
      {diffResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 24
          }}
          onClick={() => setDiffResult(null)}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              maxWidth: 760,
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
              <strong>Comparación: «{diffResult.playlistAName}» vs «{diffResult.playlistBName}»</strong>
              <button className="btn-ghost" style={{ padding: '3px 9px' }} onClick={() => setDiffResult(null)}>✕</button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 700, color: '#6ba4ff', marginBottom: 8 }}>
                  Solo en A ({diffResult.onlyInA.length})
                </div>
                {diffResult.onlyInA.map((t, i) => (
                  <div key={i} style={{ marginBottom: 4, color: 'var(--text-muted)' }}>• {t.artist} — {t.name}</div>
                ))}
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>
                  En ambas ({diffResult.shared.length})
                </div>
                {diffResult.shared.map((t, i) => (
                  <div key={i} style={{ marginBottom: 4, color: 'var(--text-muted)' }}>• {t.artist} — {t.name}</div>
                ))}
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: 8 }}>
                  Solo en B ({diffResult.onlyInB.length})
                </div>
                {diffResult.onlyInB.map((t, i) => (
                  <div key={i} style={{ marginBottom: 4, color: 'var(--text-muted)' }}>• {t.artist} — {t.name}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <span className={styles.footerHint}>
          Selecciona 2 playlists para fusionarlas o compararlas · Reordena pistas o escanea una carpeta para reparar rutas
        </span>
        <button
          className="btn-primary"
          onClick={onContinue}
          disabled={selectedPlaylists.length === 0}
        >
          Continuar a exportación {selectedPlaylists.length > 0 ? `(${selectedPlaylists.length})` : ''} →
        </button>
      </footer>
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import type {
  Playlist,
  SpotifyMatch,
  SpotifyCandidate,
  ExportResult
} from '../../../core/common/types'
import type { PendingExportConfig } from './ExportScreen'
import styles from './ReviewScreen.module.css'

type Props = {
  playlists: Playlist[]
  initialMatchesByPlaylist: Record<string, SpotifyMatch[]>
  exportConfig: PendingExportConfig
  onBack: () => void
  onExportDone: (results: ExportResult[]) => void
}

type FilterMode = 'all' | 'matched' | 'ambiguous' | 'not_found'

function formatMs(ms: number | undefined): string {
  if (!ms || ms <= 0) return '—'
  const sec = Math.round(ms / 1000)
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`
}

function formatSec(sec: number | undefined): string {
  if (!sec || sec <= 0) return '—'
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`
}

export default function ReviewScreen({
  playlists,
  initialMatchesByPlaylist,
  exportConfig,
  onBack,
  onExportDone
}: Props): JSX.Element {
  const [activePlaylistIdx, setActivePlaylistIdx] = useState(0)
  const [matchesByPlaylist, setMatchesByPlaylist] = useState<Record<string, SpotifyMatch[]>>(
    initialMatchesByPlaylist
  )
  const [filter, setFilter] = useState<FilterMode>('all')
  const [searchingTrackId, setSearchingTrackId] = useState<string | null>(null)
  const [manualQuery, setManualQuery] = useState('')
  const [manualResults, setManualResults] = useState<SpotifyCandidate[]>([])
  const [manualBusy, setManualBusy] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activePlaylist = playlists[activePlaylistIdx] ?? playlists[0]
  const activeMatches = matchesByPlaylist[activePlaylist.id] ?? []

  const counts = useMemo(() => {
    let matched = 0
    let ambiguous = 0
    let notFound = 0
    for (const m of activeMatches) {
      if (m.excluded) notFound++
      else if (m.status === 'matched' || m.status === 'manual') matched++
      else if (m.status === 'ambiguous') ambiguous++
      else notFound++
    }
    return { matched, ambiguous, notFound, total: activeMatches.length }
  }, [activeMatches])

  const visibleRows = useMemo(() => {
    return activeMatches
      .map((match, idx) => ({ match, track: activePlaylist.tracks[idx], idx }))
      .filter(({ match }) => {
        if (filter === 'all') return true
        if (filter === 'matched') return !match.excluded && (match.status === 'matched' || match.status === 'manual')
        if (filter === 'ambiguous') return !match.excluded && match.status === 'ambiguous'
        if (filter === 'not_found') return match.excluded || match.status === 'not_found'
        return true
      })
  }, [activeMatches, activePlaylist, filter])

  const updateMatch = (trackIdx: number, updated: SpotifyMatch, persistToCache = false): void => {
    const playlistId = activePlaylist.id
    setMatchesByPlaylist((prev) => {
      const list = [...(prev[playlistId] ?? [])]
      list[trackIdx] = updated
      return { ...prev, [playlistId]: list }
    })
    if (persistToCache && activePlaylist.tracks[trackIdx]) {
      window.electronAPI.spotifySaveManualMatch(activePlaylist.tracks[trackIdx], updated).catch(() => {})
    }
  }

  const selectCandidate = (trackIdx: number, cand: SpotifyCandidate): void => {
    const current = activeMatches[trackIdx]
    const updated: SpotifyMatch = {
      ...current,
      spotifyTrackId: cand.spotifyTrackId,
      spotifyUri: cand.spotifyUri,
      title: cand.title,
      artists: cand.artists,
      album: cand.album,
      durationMs: cand.durationMs,
      externalUrl: cand.externalUrl,
      confidence: Math.max(cand.score, 95),
      status: 'manual',
      excluded: false
    }
    updateMatch(trackIdx, updated, true)
    setSearchingTrackId(null)
    setManualResults([])
  }

  const toggleExclude = (trackIdx: number): void => {
    const current = activeMatches[trackIdx]
    updateMatch(trackIdx, { ...current, excluded: !current.excluded })
  }

  const openManualSearch = (trackIdx: number): void => {
    const track = activePlaylist.tracks[trackIdx]
    if (!track) return
    setSearchingTrackId(track.internalId)
    setManualQuery(`${track.artist} ${track.name}`)
    setManualResults([])
  }

  const runManualSearch = async (trackIdx: number): Promise<void> => {
    const track = activePlaylist.tracks[trackIdx]
    if (!track || !manualQuery.trim()) return
    setManualBusy(true)
    try {
      const cands = await window.electronAPI.spotifySearchManual(manualQuery.trim(), track)
      setManualResults(cands)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setManualBusy(false)
    }
  }

  const handleConfirmAndExport = async (): Promise<void> => {
    setFinalizing(true)
    setError(null)
    try {
      const spotifyUrlsByPlaylist: Record<string, string> = {}
      const spotifyResultsByPlaylist: Record<
        string,
        {
          playlistUrl: string
          matched: number
          notFound: number
          unmatchedTracks: Array<{ artist: string; name: string }>
        }
      > = {}

      for (const playlist of playlists) {
        const matches = matchesByPlaylist[playlist.id] ?? []
        const targetName = exportConfig.playlistNamePrefix
          ? `${exportConfig.playlistNamePrefix} ${playlist.name}`
          : playlist.name
        const spRes = await window.electronAPI.spotifyCreatePlaylist(targetName, matches, {
          isPublic: exportConfig.spotifyPublic
        })
        spotifyUrlsByPlaylist[playlist.id] = spRes.playlistUrl
        spotifyResultsByPlaylist[playlist.id] = spRes
      }

      const needsFolder =
        exportConfig.exportM3U8 ||
        exportConfig.exportNml ||
        exportConfig.exportRekordboxXml ||
        exportConfig.exportSetlist ||
        exportConfig.exportCueSheet ||
        exportConfig.exportPrepSheetHtml ||
        exportConfig.exportStreamingCsv ||
        exportConfig.exportSpotifyTxt

      let finalResults: ExportResult[] = []
      if (needsFolder && exportConfig.outputDir) {
        finalResults = await window.electronAPI.exportPlaylists(playlists, {
          outputDir: exportConfig.outputDir,
          exportM3U8: exportConfig.exportM3U8,
          exportNml: exportConfig.exportNml,
          exportRekordboxXml: exportConfig.exportRekordboxXml,
          exportSetlist: exportConfig.exportSetlist,
          exportCueSheet: exportConfig.exportCueSheet,
          exportPrepSheetHtml: exportConfig.exportPrepSheetHtml,
          exportStreamingCsv: exportConfig.exportStreamingCsv,
          exportSpotifyTxt: exportConfig.exportSpotifyTxt,
          playlistNamePrefix: exportConfig.playlistNamePrefix || undefined,
          preserveFolders: exportConfig.preserveFolders,
          relativeM3uPaths: exportConfig.relativeM3uPaths,
          copyAudioFiles: exportConfig.copyAudioFiles,
          spotifyMatchesByPlaylist: matchesByPlaylist,
          spotifyUrlsByPlaylist
        })
      } else {
        finalResults = playlists.map((p) => ({
          playlistName: p.name,
          totalTracks: p.tracks.length,
          matchedTracks: 0,
          ambiguousTracks: 0,
          notFoundTracks: 0,
          exportedAt: new Date().toISOString()
        }))
      }

      finalResults = finalResults.map((res, idx) => {
        const sp = spotifyResultsByPlaylist[playlists[idx].id]
        if (!sp) return res
        return {
          ...res,
          spotifyPlaylistUrl: sp.playlistUrl,
          spotifyPublic: exportConfig.spotifyPublic,
          spotifyMatched: sp.matched,
          spotifyNotFound: sp.notFound,
          spotifyUnmatchedTracks: sp.unmatchedTracks
        }
      })

      onExportDone(finalResults)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setFinalizing(false)
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className="btn-ghost" onClick={onBack} disabled={finalizing}>← Opciones</button>
        <h2>Revisión de coincidencias Spotify</h2>
        <div className={styles.headerStats}>
          <span className="tag tag-green">✓ {counts.matched}</span>
          <span className="tag tag-amber">? {counts.ambiguous}</span>
          <span className="tag tag-red">✕ {counts.notFound}</span>
        </div>
      </header>

      {/* Playlist selector tabs if multiple playlists */}
      {playlists.length > 1 && (
        <div className={styles.playlistTabs}>
          {playlists.map((p, idx) => (
            <button
              key={p.id}
              className={idx === activePlaylistIdx ? styles.tabActive : styles.tab}
              onClick={() => {
                setActivePlaylistIdx(idx)
                setSearchingTrackId(null)
              }}
            >
              {p.name} ({p.tracks.length})
            </button>
          ))}
        </div>
      )}

      {/* Filter toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          {(
            [
              ['all', `Todos (${counts.total})`],
              ['matched', `Confirmados (${counts.matched})`],
              ['ambiguous', `Dudosos (${counts.ambiguous})`],
              ['not_found', `No encontrados (${counts.notFound})`]
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? styles.filterActive : styles.filterBtn}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className={styles.toolbarHint}>
          Bootlegs, promos y edits privados pueden no existir en Spotify; puedes buscar otra versión o omitirlos.
        </span>
      </div>

      {error && (
        <div className={styles.errorBanner}>⚠️ {error}</div>
      )}

      {/* Review table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 38 }}>#</th>
              <th>Track Rekordbox</th>
              <th>Coincidencia Spotify</th>
              <th style={{ width: 95 }}>Confianza</th>
              <th style={{ width: 220 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ match, track, idx }) => {
              const isSearching = searchingTrackId === track?.internalId
              const isExcluded = Boolean(match.excluded)
              const badgeClass = isExcluded || match.status === 'not_found'
                ? 'tag-red'
                : match.status === 'ambiguous'
                  ? 'tag-amber'
                  : 'tag-green'

              return (
                <React.Fragment key={`${match.sourceTrackId}-${idx}`}>
                  <tr className={isExcluded ? styles.rowMuted : styles.row}>
                    <td className={styles.numCell}>{idx + 1}</td>
                    <td>
                      <div className={styles.trackTitle}>{match.sourceTitle}</div>
                      <div className={styles.trackSub}>
                        {match.sourceArtist} · {formatSec(match.sourceDurationSeconds)}
                      </div>
                    </td>
                    <td>
                      {match.spotifyUri && !isExcluded ? (
                        <div>
                          <div className={styles.trackTitle}>{match.title}</div>
                          <div className={styles.trackSub}>
                            {match.artists?.join(', ')} · {formatMs(match.durationMs)}
                          </div>
                          {match.candidates.length > 1 && (
                            <select
                              className={styles.candSelect}
                              value={match.spotifyTrackId ?? ''}
                              onChange={(e) => {
                                const found = match.candidates.find(
                                  (c) => c.spotifyTrackId === e.target.value
                                )
                                if (found) selectCandidate(idx, found)
                              }}
                            >
                              {match.candidates.map((c) => (
                                <option key={c.spotifyTrackId} value={c.spotifyTrackId}>
                                  [{c.score}%] {c.artists.join(', ')} — {c.title} ({formatMs(c.durationMs)})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <span className={styles.noMatchText}>
                          {isExcluded ? 'Omitido manualmente' : 'No encontrado en Spotify'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.confidenceMeterWrap}>
                        <span className={`tag ${badgeClass}`}>
                          {isExcluded
                            ? 'Omitido'
                            : match.status === 'manual'
                              ? 'Manual'
                              : match.status === 'not_found'
                                ? '0%'
                                : `${match.confidence}%`}
                        </span>
                        <div className={styles.confidenceBarTrack}>
                          <div
                            className={styles.confidenceBarFill}
                            style={{
                              width: `${isExcluded || match.status === 'not_found' ? 0 : match.confidence}%`,
                              background:
                                isExcluded || match.status === 'not_found'
                                  ? '#ef5350'
                                  : match.status === 'ambiguous'
                                    ? '#ff7a1a'
                                    : '#1db954'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() =>
                            isSearching ? setSearchingTrackId(null) : openManualSearch(idx)
                          }
                        >
                          {isSearching ? 'Cerrar' : 'Buscar'}
                        </button>
                        {match.spotifyUri && (
                          <button
                            className="btn-ghost"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => toggleExclude(idx)}
                          >
                            {isExcluded ? 'Incluir' : 'Omitir'}
                          </button>
                        )}
                        {match.externalUrl && !isExcluded && (
                          <button
                            className="btn-ghost"
                            style={{ fontSize: 11, padding: '4px 8px', color: 'var(--green)' }}
                            onClick={() => window.electronAPI.openExternal(match.externalUrl!)}
                            title="Abrir canción en Spotify"
                          >
                            ↗
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {isSearching && (
                    <tr className={styles.manualRow}>
                      <td colSpan={5}>
                        <div className={styles.manualBox}>
                          <div className={styles.manualSearchBar}>
                            <input
                              type="text"
                              value={manualQuery}
                              onChange={(e) => setManualQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') runManualSearch(idx)
                              }}
                              placeholder="Edita la búsqueda en Spotify..."
                              style={{ flex: 1 }}
                            />
                            <button
                              className="btn-primary"
                              onClick={() => runManualSearch(idx)}
                              disabled={manualBusy}
                            >
                              {manualBusy ? 'Buscando...' : 'Buscar en Spotify'}
                            </button>
                          </div>
                          {manualResults.length > 0 && (
                            <div className={styles.manualList}>
                              {manualResults.map((cand) => (
                                <div key={cand.spotifyTrackId} className={styles.manualItem}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <strong>{cand.title}</strong>
                                    <span className={styles.trackSub}>
                                      {' '}— {cand.artists.join(', ')} ({cand.album} · {formatMs(cand.durationMs)})
                                    </span>
                                  </div>
                                  <span className="tag tag-muted">{cand.score}%</span>
                                  <button
                                    className="btn-green"
                                    style={{ fontSize: 11, padding: '4px 10px' }}
                                    onClick={() => selectCandidate(idx, cand)}
                                  >
                                    Elegir
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <footer className={styles.footer}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Se añadirán los tracks confirmados y dudosos no omitidos conservando el orden exacto de Rekordbox
        </span>
        <button
          className="btn-green"
          onClick={handleConfirmAndExport}
          disabled={finalizing}
          style={{ minWidth: 230, padding: '10px 20px' }}
        >
          {finalizing ? 'Creando playlists y exportando...' : 'Confirmar y finalizar exportación →'}
        </button>
      </footer>
    </div>
  )
}

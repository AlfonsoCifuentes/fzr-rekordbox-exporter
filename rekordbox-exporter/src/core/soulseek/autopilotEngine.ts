import { SlskClient, FileAttribute, type SearchResult } from 'slsk-client'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import type { Playlist } from '../common/types'
import { sanitizeFilename } from '../common/filePaths'
import {
  autopilotTrackSignature,
  buildAutopilotReport,
  buildQueryVariations,
  cleanSoulseekQuery,
  computeAutopilotStats,
  rankSoulseekCandidates
} from './queryUtils'
import type {
  AutopilotConfig,
  AutopilotLogEntry,
  AutopilotProgressEvent,
  AutopilotSessionState,
  AutopilotTrackItem,
  RankedSoulseekCandidate,
  SoulseekCandidateInput
} from './types'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.aiff', '.aif', '.m4a', '.ogg', '.alac'])

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      resolve()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function toCandidateInput(r: SearchResult): SoulseekCandidateInput {
  return {
    user: r.user,
    file: r.file,
    size: r.size,
    slots: r.slots,
    speed: r.speed,
    bitrate: r.attribs?.[FileAttribute.Bitrate],
    sampleRate: r.attribs?.[FileAttribute.SampleRate],
    bitDepth: r.attribs?.[FileAttribute.BitDepth],
    queueLength: r.queueLength
  }
}

function scanExistingNormalizedFiles(dir: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!dir || !existsSync(dir)) return map
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const ext = extname(entry.name).toLowerCase()
      if (!AUDIO_EXTENSIONS.has(ext)) continue
      const stem = entry.name.slice(0, entry.name.length - ext.length)
      const norm = cleanSoulseekQuery('', stem).toLowerCase()
      if (norm) map.set(norm, join(dir, entry.name))
    }
  } catch {
    // ignore read error
  }
  return map
}

function findExistingFileForTrack(
  existingMap: Map<string, string>,
  artist: string,
  title: string
): string | null {
  const queryNorm = cleanSoulseekQuery(artist, title).toLowerCase()
  const titleNorm = cleanSoulseekQuery('', title).toLowerCase()
  if (!titleNorm) return null

  if (existingMap.has(queryNorm)) return existingMap.get(queryNorm) ?? null

  for (const [stem, fullPath] of existingMap.entries()) {
    if (stem.includes(titleNorm)) {
      const artistFirst = cleanSoulseekQuery('', artist.split(/[,&]/)[0] ?? '').toLowerCase()
      if (!artistFirst || stem.includes(artistFirst)) {
        return fullPath
      }
    }
  }
  return null
}

/**
 * Validate Soulseek credentials live against the Soulseek server.
 */
export async function testSoulseekLogin(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!username.trim() || !password) {
    return { ok: false, error: 'Introduce tu usuario y contraseña de Soulseek.' }
  }
  const client = new SlskClient({ timeout: 10000, reconnect: false })
  try {
    await client.login(username.trim(), password)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Error al iniciar sesión en Soulseek' }
  } finally {
    try {
      client.destroy()
    } catch {
      // ignore cleanup error
    }
  }
}

export type AutopilotCallbacks = {
  onProgress: (event: AutopilotProgressEvent) => void
  onSaveState: (state: AutopilotSessionState) => void
  onClearState: () => void
  onCompleteNotification?: (title: string, body: string) => void
}

/**
 * Native Electron/Node Soulseek Autopilot Engine.
 * Supports quality filters, presets, dry-run, pause/resume, state persistence,
 * exponential retry, anti-ban rate limiting, duplicate/existing detection, and JSON reports.
 */
export class SoulseekAutopilotEngine {
  private client: SlskClient | null = null
  private abortController: AbortController | null = null
  private paused = false
  private running = false
  private pauseWaiters: Array<() => void> = []

  isRunning(): boolean {
    return this.running
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
    const waiters = this.pauseWaiters.splice(0, this.pauseWaiters.length)
    for (const w of waiters) w()
  }

  cancel(): void {
    this.paused = false
    const waiters = this.pauseWaiters.splice(0, this.pauseWaiters.length)
    for (const w of waiters) w()
    this.abortController?.abort()
    try {
      this.client?.destroy()
    } catch {
      // ignore
    }
    this.client = null
  }

  private async waitIfPaused(signal: AbortSignal): Promise<void> {
    while (this.paused && !signal.aborted) {
      await new Promise<void>((resolve) => {
        const done = (): void => {
          signal.removeEventListener('abort', done)
          resolve()
        }
        this.pauseWaiters.push(done)
        signal.addEventListener('abort', done, { once: true })
      })
    }
  }

  async run(
    playlist: Playlist,
    config: AutopilotConfig,
    callbacks: AutopilotCallbacks,
    resumeState?: AutopilotSessionState
  ): Promise<AutopilotProgressEvent> {
    if (this.running) {
      throw new Error('Ya hay una sesión de Soulseek Autopilot en ejecución.')
    }
    if (!config.username.trim() || !config.password) {
      throw new Error('Configura tu usuario y contraseña de Soulseek antes de iniciar.')
    }
    if (!config.dryRun && !config.downloadDir.trim()) {
      throw new Error('Selecciona una carpeta de descargas para guardar los audios.')
    }

    this.running = true
    this.paused = false
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    const sessionId = resumeState?.sessionId ?? randomUUID()
    const startedAt = Date.now()
    const logs: AutopilotLogEntry[] = []

    const pushLog = (level: AutopilotLogEntry['level'], message: string): void => {
      logs.unshift({
        timestamp: new Date().toLocaleTimeString(),
        level,
        message
      })
      if (logs.length > 80) logs.length = 80
    }

    const tracks: AutopilotTrackItem[] =
      resumeState?.tracks && resumeState.tracks.length === playlist.tracks.length
        ? resumeState.tracks.map((t) => ({ ...t }))
        : playlist.tracks.map((t) => ({
            trackId: t.internalId,
            artist: t.artist,
            name: t.name,
            cleanedQuery: cleanSoulseekQuery(t.artist, t.name),
            status: 'pending',
            attempts: 0
          }))

    const startIndex = resumeState?.nextIndex ?? 0
    const playlistSubdir = config.downloadDir
      ? join(config.downloadDir, sanitizeFilename(playlist.name, 'Soulseek_Playlist'))
      : ''

    if (!config.dryRun && playlistSubdir && !existsSync(playlistSubdir)) {
      mkdirSync(playlistSubdir, { recursive: true })
    }

    let currentIndex = startIndex
    let currentTrackLabel: string | undefined
    let phase: AutopilotProgressEvent['phase'] = 'connecting'
    let rateLimitRemainingSec = 0
    let reportPath: string | undefined
    let fatalError: string | undefined

    const buildEvent = (): AutopilotProgressEvent => {
      const elapsedMs = Date.now() - startedAt
      const successful = tracks.filter((t) => t.status === 'completed').length
      const dryRunFound = tracks.filter((t) => t.status === 'dry-run').length
      const failed = tracks.filter((t) => t.status === 'failed').length
      const skipped = tracks.filter(
        (t) => t.status === 'skipped-duplicate' || t.status === 'skipped-existing'
      ).length
      const processedSinceStart = Math.max(0, currentIndex - startIndex)
      const remaining = Math.max(0, tracks.length - currentIndex)
      const etaMs =
        processedSinceStart > 0 && remaining > 0
          ? Math.round((elapsedMs / processedSinceStart) * remaining)
          : null

      const { qualityBreakdown, artistStats } = computeAutopilotStats(tracks)
      return {
        sessionId,
        playlistName: playlist.name,
        phase: this.paused && phase === 'running' ? 'paused' : phase,
        currentIndex,
        totalTracks: tracks.length,
        currentTrackLabel,
        successful,
        dryRunFound,
        failed,
        skipped,
        elapsedMs,
        etaMs,
        rateLimitRemainingSec,
        tracks: tracks.map((t) => ({ ...t })),
        qualityBreakdown,
        artistStats,
        logs: [...logs],
        reportPath,
        fatalError
      }
    }

    const emit = (): void => {
      callbacks.onProgress(buildEvent())
    }

    const saveResumeState = (nextIdx: number): void => {
      callbacks.onSaveState({
        sessionId,
        playlistId: playlist.id,
        playlistName: playlist.name,
        savedAt: new Date().toISOString(),
        nextIndex: nextIdx,
        tracks: tracks.map((t) => ({ ...t })),
        downloadDir: config.downloadDir
      })
    }

    const heartbeat = setInterval(() => {
      if (this.running) emit()
    }, 1000)

    try {
      pushLog('info', `Conectando a la red Soulseek como "${config.username}"...`)
      emit()

      const client = new SlskClient({
        timeout: 12000,
        downloadTimeout: 60000,
        downloadRetries: 2,
        reconnect: { retries: 3 }
      })
      this.client = client
      await client.login(config.username.trim(), config.password)
      pushLog(
        'success',
        `Sesión Soulseek iniciada (${config.dryRun ? 'MODO DRY-RUN · sin descargas' : `filtro ${config.qualityFilter.toUpperCase()}`}).`
      )

      const seenSignatures = new Set<string>()
      for (let i = 0; i < startIndex; i++) {
        seenSignatures.add(autopilotTrackSignature(tracks[i].artist, tracks[i].name))
      }

      const existingFiles = config.skipExistingInFolder
        ? scanExistingNormalizedFiles(playlistSubdir || config.downloadDir)
        : new Map<string, string>()

      let searchesInBatch = 0
      phase = 'running'
      emit()

      for (let i = startIndex; i < tracks.length; i++) {
        if (signal.aborted) break

        if (this.paused) {
          saveResumeState(i)
          emit()
          await this.waitIfPaused(signal)
          if (signal.aborted) break
          emit()
        }

        currentIndex = i
        const item = tracks[i]
        currentTrackLabel = `${item.artist} — ${item.name}`
        const trackStart = Date.now()

        // 1. Duplicate check
        const sig = autopilotTrackSignature(item.artist, item.name)
        if (sig && seenSignatures.has(sig)) {
          item.status = 'skipped-duplicate'
          item.durationMs = 0
          pushLog('warn', `[${i + 1}/${tracks.length}] Duplicado omitido: ${currentTrackLabel}`)
          emit()
          continue
        }
        if (sig) seenSignatures.add(sig)

        // 2. Existing file check
        if (config.skipExistingInFolder && existingFiles.size > 0) {
          const localMatch = findExistingFileForTrack(existingFiles, item.artist, item.name)
          if (localMatch) {
            item.status = 'skipped-existing'
            item.savedPath = localMatch
            item.durationMs = 0
            pushLog('info', `[${i + 1}/${tracks.length}] Ya existe en carpeta: ${currentTrackLabel}`)
            emit()
            continue
          }
        }

        // 3. Search & download with smart retries + query variations
        const queries = buildQueryVariations(item.artist, item.name)
        const maxRetries = Math.max(1, config.maxRetries)
        let succeeded = false
        let lastError = 'Sin resultados que cumplan el filtro de calidad'

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          if (signal.aborted) break
          if (this.paused) {
            saveResumeState(i)
            emit()
            await this.waitIfPaused(signal)
            if (signal.aborted) break
          }

          item.attempts = attempt
          item.status = 'searching'
          const query = queries[Math.min(attempt - 1, queries.length - 1)] || item.cleanedQuery
          item.cleanedQuery = query
          emit()

          pushLog(
            'info',
            `[${i + 1}/${tracks.length}] Buscando (intento ${attempt}/${maxRetries}): "${query}"`
          )

          let ranked: RankedSoulseekCandidate[] = []
          try {
            const rawResults = await client.search({
              req: query,
              timeout: config.searchTimeoutMs
            })
            searchesInBatch++
            ranked = rankSoulseekCandidates(
              rawResults.map(toCandidateInput),
              item.artist,
              item.name,
              config.qualityFilter
            )
          } catch (err) {
            lastError = `Error en búsqueda: ${(err as Error).message}`
            pushLog('warn', lastError)
          }

          if (ranked.length === 0) {
            lastError = `Sin resultados válidos (${config.qualityFilter}) para "${query}"`
            if (attempt < maxRetries && !signal.aborted) {
              const backoffMs = config.retryDelayMs * attempt
              pushLog('warn', `${lastError} · Reintentando en ${Math.round(backoffMs / 1000)}s...`)
              await delay(backoffMs, signal)
            }
            continue
          }

          const best = ranked[0]
          item.qualityTier = best.qualityTier
          item.qualityLabel = best.qualityLabel
          item.peer = best.user
          item.remoteFile = best.file
          item.fileSizeBytes = best.size

          if (config.dryRun) {
            item.status = 'dry-run'
            item.durationMs = Date.now() - trackStart
            succeeded = true
            pushLog(
              'success',
              `[DRY-RUN] Hallado ${best.qualityLabel} (match ${best.matchScore}%) en peer "${best.user}"`
            )
            emit()
            break
          }

          // Try top 3 ranked peers in case the #1 peer refuses or times out
          const topPeers = ranked.slice(0, 3)
          for (const candidate of topPeers) {
            if (signal.aborted) break
            item.status = 'downloading'
            item.peer = candidate.user
            item.remoteFile = candidate.file
            item.qualityTier = candidate.qualityTier
            item.qualityLabel = candidate.qualityLabel
            item.fileSizeBytes = candidate.size
            item.downloadPercent = 0
            emit()

            const ext = extname(candidate.file) || '.mp3'
            const safeName = sanitizeFilename(`${item.artist} - ${item.name}`, `track_${i + 1}`)
            const destPath = join(playlistSubdir, `${safeName}${ext}`)

            try {
              const dl = client.download({
                user: candidate.user,
                file: candidate.file,
                size: candidate.size,
                path: destPath,
                timeout: 45000,
                signal
              })

              dl.on('progress', (prog) => {
                if (typeof prog.progress === 'number') {
                  item.downloadPercent = Math.round(prog.progress * 100)
                }
              })

              const result = await dl
              item.status = 'completed'
              item.savedPath = result.path || destPath
              item.downloadPercent = 100
              item.durationMs = Date.now() - trackStart
              succeeded = true
              pushLog(
                'success',
                `Descargado ${candidate.qualityLabel} de "${candidate.user}": ${safeName}${ext}`
              )
              emit()
              break
            } catch (dlErr) {
              lastError = `Peer "${candidate.user}" falló: ${(dlErr as Error).message}`
              pushLog('warn', lastError)
            }
          }

          if (succeeded) break

          if (attempt < maxRetries && !signal.aborted) {
            const backoffMs = config.retryDelayMs * attempt
            await delay(backoffMs, signal)
          }
        }

        if (!succeeded && !signal.aborted) {
          item.status = 'failed'
          item.error = lastError
          item.durationMs = Date.now() - trackStart
          pushLog('error', `Falló: ${currentTrackLabel} (${lastError})`)
          emit()
        }

        // Persist resume checkpoint every 5 tracks
        if ((i + 1) % 5 === 0) {
          saveResumeState(i + 1)
        }

        // Inter-track download delay
        if (!signal.aborted && i < tracks.length - 1 && config.downloadDelayMs > 0) {
          await delay(config.downloadDelayMs, signal)
        }

        // Anti-ban rate limit pause every N searches
        if (
          !signal.aborted &&
          i < tracks.length - 1 &&
          config.rateLimitBatch > 0 &&
          searchesInBatch >= config.rateLimitBatch
        ) {
          searchesInBatch = 0
          phase = 'rate-limit'
          pushLog(
            'warn',
            `Pausa anti-ban de ${config.rateLimitPauseSec}s tras ${config.rateLimitBatch} búsquedas...`
          )
          for (let sec = config.rateLimitPauseSec; sec > 0; sec--) {
            if (signal.aborted) break
            rateLimitRemainingSec = sec
            emit()
            await delay(1000, signal)
          }
          rateLimitRemainingSec = 0
          phase = 'running'
          emit()
        }
      }

      if (signal.aborted) {
        phase = 'cancelled'
        saveResumeState(currentIndex)
        pushLog('warn', 'Autopilot cancelado por el usuario. El progreso quedó guardado para reanudar.')
      } else {
        currentIndex = tracks.length
        phase = 'completed'
        callbacks.onClearState()

        // Export detailed JSON report
        const reportDir = playlistSubdir || config.downloadDir
        if (reportDir) {
          try {
            if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true })
            const safePl = sanitizeFilename(playlist.name, 'playlist')
            reportPath = join(reportDir, `${safePl}_resultados.json`)
            const report = buildAutopilotReport({
              sessionId,
              playlistName: playlist.name,
              downloadDir: reportDir,
              dryRun: config.dryRun,
              qualityFilter: config.qualityFilter,
              tracks,
              durationMs: Date.now() - startedAt
            })
            writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')
            pushLog('success', `Informe JSON guardado en: ${reportPath}`)
          } catch (err) {
            pushLog('warn', `No se pudo guardar el informe JSON: ${(err as Error).message}`)
          }
        }

        const okCount = tracks.filter(
          (t) => t.status === 'completed' || t.status === 'dry-run'
        ).length
        const failCount = tracks.filter((t) => t.status === 'failed').length
        pushLog(
          'success',
          `Autopilot finalizado: ${okCount} exitosas · ${failCount} fallidas de ${tracks.length} pistas.`
        )

        if (config.enableNotifications && callbacks.onCompleteNotification) {
          callbacks.onCompleteNotification(
            'FZR Soulseek Autopilot completado',
            `${playlist.name}: ${okCount}/${tracks.length} pistas ${config.dryRun ? 'encontradas (Dry-Run)' : 'descargadas'}.`
          )
        }
      }
    } catch (err) {
      phase = 'error'
      fatalError = (err as Error).message || 'Error inesperado en Soulseek Autopilot'
      pushLog('error', fatalError)
    } finally {
      clearInterval(heartbeat)
      this.running = false
      this.paused = false
      try {
        this.client?.destroy()
      } catch {
        // ignore
      }
      this.client = null
      this.abortController = null
    }

    const finalEvent = buildEvent()
    callbacks.onProgress(finalEvent)
    return finalEvent
  }
}

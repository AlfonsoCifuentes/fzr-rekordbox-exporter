export type QualityFilter = 'all' | '320+' | 'flac' | 'hires'

export type AutopilotPreset = 'fast' | 'balanced' | 'safe'

export type QualityTier = 'hires' | 'flac' | 'mp3_320' | 'mp3_256' | 'mp3_192' | 'other'

export type AutopilotConfig = {
  username: string
  password: string
  downloadDir: string
  qualityFilter: QualityFilter
  preset: AutopilotPreset
  searchTimeoutMs: number
  downloadDelayMs: number
  rateLimitBatch: number
  rateLimitPauseSec: number
  maxRetries: number
  retryDelayMs: number
  dryRun: boolean
  enableNotifications: boolean
  skipExistingInFolder: boolean
}

export const AUTOPILOT_PRESETS: Record<
  AutopilotPreset,
  Pick<
    AutopilotConfig,
    'searchTimeoutMs' | 'downloadDelayMs' | 'rateLimitBatch' | 'rateLimitPauseSec' | 'maxRetries' | 'retryDelayMs'
  >
> = {
  fast: {
    searchTimeoutMs: 5000,
    downloadDelayMs: 1200,
    rateLimitBatch: 100,
    rateLimitPauseSec: 90,
    maxRetries: 2,
    retryDelayMs: 3000
  },
  balanced: {
    searchTimeoutMs: 7000,
    downloadDelayMs: 2000,
    rateLimitBatch: 50,
    rateLimitPauseSec: 180,
    maxRetries: 3,
    retryDelayMs: 5000
  },
  safe: {
    searchTimeoutMs: 10000,
    downloadDelayMs: 3000,
    rateLimitBatch: 25,
    rateLimitPauseSec: 300,
    maxRetries: 3,
    retryDelayMs: 7000
  }
}

export const DEFAULT_AUTOPILOT_CONFIG: AutopilotConfig = {
  username: '',
  password: '',
  downloadDir: '',
  qualityFilter: '320+',
  preset: 'balanced',
  ...AUTOPILOT_PRESETS.balanced,
  dryRun: false,
  enableNotifications: true,
  skipExistingInFolder: true
}

export type SoulseekCandidateInput = {
  user: string
  file: string
  size: number
  slots: boolean
  speed: number
  bitrate?: number
  sampleRate?: number
  bitDepth?: number
  queueLength?: number
}

export type RankedSoulseekCandidate = SoulseekCandidateInput & {
  qualityTier: QualityTier
  qualityLabel: string
  matchScore: number
  totalScore: number
}

export type AutopilotTrackStatus =
  | 'pending'
  | 'searching'
  | 'downloading'
  | 'completed'
  | 'dry-run'
  | 'skipped-duplicate'
  | 'skipped-existing'
  | 'failed'

export type AutopilotTrackItem = {
  trackId: string
  artist: string
  name: string
  cleanedQuery: string
  status: AutopilotTrackStatus
  attempts: number
  qualityTier?: QualityTier
  qualityLabel?: string
  peer?: string
  remoteFile?: string
  savedPath?: string
  fileSizeBytes?: number
  downloadPercent?: number
  error?: string
  durationMs?: number
}

export type AutopilotArtistStat = {
  artist: string
  total: number
  succeeded: number
  failed: number
  successRate: number
}

export type AutopilotLogEntry = {
  timestamp: string
  level: 'info' | 'success' | 'warn' | 'error'
  message: string
}

export type AutopilotProgressEvent = {
  sessionId: string
  playlistName: string
  phase:
    | 'idle'
    | 'connecting'
    | 'running'
    | 'paused'
    | 'rate-limit'
    | 'completed'
    | 'cancelled'
    | 'error'
  currentIndex: number
  totalTracks: number
  currentTrackLabel?: string
  successful: number
  dryRunFound: number
  failed: number
  skipped: number
  elapsedMs: number
  etaMs: number | null
  rateLimitRemainingSec: number
  tracks: AutopilotTrackItem[]
  qualityBreakdown: Record<string, number>
  artistStats: AutopilotArtistStat[]
  logs: AutopilotLogEntry[]
  reportPath?: string
  fatalError?: string
}

export type AutopilotSessionState = {
  sessionId: string
  playlistId: string
  playlistName: string
  savedAt: string
  nextIndex: number
  tracks: AutopilotTrackItem[]
  downloadDir: string
}

export type AutopilotReport = {
  timestamp: string
  sessionId: string
  playlistName: string
  downloadDir: string
  dryRun: boolean
  qualityFilter: QualityFilter
  total: number
  exitosasCount: number
  dryRunCount: number
  fallidasCount: number
  omitidasCount: number
  successRate: number
  durationMs: number
  qualityDistribution: Record<string, number>
  artistStats: AutopilotArtistStat[]
  exitosas: Array<{
    artist: string
    song: string
    quality: string
    peer?: string
    savedPath?: string
    attempts: number
  }>
  fallidas: Array<{
    artist: string
    song: string
    reason: string
    attempts: number
  }>
  omitidas: Array<{
    artist: string
    song: string
    reason: string
  }>
}

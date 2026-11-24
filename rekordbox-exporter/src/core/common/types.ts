export type CuePoint = {
  name?: string
  /** 0 = Cue, 1 = Fade-In, 2 = Fade-Out, 3 = Load, 4 = Loop */
  type: number
  /** Start position in milliseconds */
  startMs: number
  /** End position in milliseconds (for loops) */
  endMs?: number
  /** -1 = Memory cue, 0..7 = Hot Cue A..H */
  hotCueIndex?: number
  color?: { r: number; g: number; b: number }
}

export type Track = {
  internalId: string
  rekordboxTrackId?: string
  name: string
  artist: string
  album?: string
  remixer?: string
  mix?: string
  genre?: string
  label?: string
  composer?: string
  year?: number
  bpm?: number
  key?: string
  durationSeconds?: number
  location?: string
  comments?: string
  rating?: number
  dateAdded?: string
  fileSize?: number
  bitrate?: number
  sampleRate?: number
  cuePoints?: CuePoint[]
  /** Optional disk existence flag populated before/during export */
  fileExists?: boolean
}

export type Playlist = {
  id: string
  name: string
  path: string[]
  tracks: Track[]
}

export type ParseResult = {
  tracks: Track[]
  playlists: Playlist[]
  warnings: string[]
}

export type SpotifyScoreBreakdown = {
  title: number
  artist: number
  duration: number
  mix: number
  album: number
}

export type SpotifyCandidate = {
  spotifyTrackId: string
  spotifyUri: string
  title: string
  artists: string[]
  album: string
  durationMs: number
  year?: number
  externalUrl?: string
  albumArtUrl?: string
  score: number
  breakdown?: SpotifyScoreBreakdown
}

export type SpotifyMatch = {
  sourceTrackId: string
  sourceTitle: string
  sourceArtist: string
  sourceDurationSeconds?: number
  spotifyTrackId?: string
  spotifyUri?: string
  title?: string
  artists?: string[]
  album?: string
  durationMs?: number
  externalUrl?: string
  confidence: number
  status: 'matched' | 'ambiguous' | 'not_found' | 'manual'
  excluded?: boolean
  queryUsed?: string
  candidates: SpotifyCandidate[]
}

export type ExportResult = {
  playlistName: string
  folderPath?: string[]
  totalTracks: number
  matchedTracks: number
  ambiguousTracks: number
  notFoundTracks: number
  missingFilesCount?: number
  copiedFilesCount?: number
  spotifyPlaylistUrl?: string
  spotifyPublic?: boolean
  spotifyMatched?: number
  spotifyNotFound?: number
  spotifyUnmatchedTracks?: Array<{ artist: string; name: string }>
  spotifyTxtPath?: string
  rekordboxXmlPath?: string
  setlistTxtPath?: string
  setlistMdPath?: string
  cueSheetPath?: string
  streamingCsvPath?: string
  nmlPath?: string
  m3uPath?: string
  reportJsonPath?: string
  reportCsvPath?: string
  exportedAt: string
}

export type TrackExportStatus = {
  track: Track
  spotifyMatch?: SpotifyMatch
  m3uIncluded: boolean
  nmlIncluded: boolean
  fileExists?: boolean
  copiedTo?: string
  warnings: string[]
}

export type ExportHistoryEntry = {
  id: string
  exportedAt: string
  sourceFile: string
  playlistCount: number
  totalTracks: number
  outputDir?: string
  formats: string[]
  spotifyUrls: string[]
}

export type Track = {
  internalId: string
  rekordboxTrackId?: string
  name: string
  artist: string
  album?: string
  remixer?: string
  mix?: string
  genre?: string
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

export type SpotifyCandidate = {
  spotifyTrackId: string
  spotifyUri: string
  title: string
  artists: string[]
  album: string
  durationMs: number
  score: number
}

export type SpotifyMatch = {
  sourceTrackId: string
  spotifyTrackId?: string
  spotifyUri?: string
  title?: string
  artists?: string[]
  album?: string
  durationMs?: number
  confidence: number
  status: 'matched' | 'ambiguous' | 'not_found' | 'manual'
  candidates: SpotifyCandidate[]
}

export type ExportResult = {
  playlistName: string
  totalTracks: number
  matchedTracks: number
  ambiguousTracks: number
  notFoundTracks: number
  spotifyPlaylistUrl?: string
  spotifyMatched?: number
  spotifyNotFound?: number
  spotifyTxtPath?: string
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
  warnings: string[]
}

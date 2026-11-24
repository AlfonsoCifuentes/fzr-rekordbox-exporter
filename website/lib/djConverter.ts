/**
 * 100% client-side browser DJ library parser, harmonic analyzer, and multi-format exporter.
 * Zero server uploads — runs entirely in browser memory using native DOMParser & TextDecoder.
 */

export type WebCuePoint = {
  name?: string
  type: number // 0=cue, 4=loop
  startMs: number
  endMs?: number
  hotCueIndex?: number
}

export type WebTrack = {
  id: string
  name: string
  artist: string
  album?: string
  genre?: string
  bpm?: number
  key?: string
  durationSeconds?: number
  location?: string
  cuePoints?: WebCuePoint[]
}

export type WebPlaylist = {
  id: string
  name: string
  folder: string
  tracks: WebTrack[]
}

export type WebParseOutput = {
  format: string
  playlists: WebPlaylist[]
  totalTracks: number
}

export type WebTransitionRating = "perfect" | "energy" | "clash" | "unknown"

export type WebAnalytics = {
  totalTracks: number
  totalDurationSeconds: number
  bpmMin?: number
  bpmMax?: number
  bpmAvg?: number
  harmonicScore: number | null
  perfectCount: number
  energyCount: number
  clashCount: number
  transitions: Array<{ rating: WebTransitionRating; fromKey?: string; toKey?: string }>
  duplicateCount: number
  totalCues: number
  topKeys: Array<{ key: string; count: number }>
}

const KEY_TO_CAMELOT: Record<string, string> = {
  "1a": "1A", "2a": "2A", "3a": "3A", "4a": "4A", "5a": "5A", "6a": "6A",
  "7a": "7A", "8a": "8A", "9a": "9A", "10a": "10A", "11a": "11A", "12a": "12A",
  "1b": "1B", "2b": "2B", "3b": "3B", "4b": "4B", "5b": "5B", "6b": "6B",
  "7b": "7B", "8b": "8B", "9b": "9B", "10b": "10B", "11b": "11B", "12b": "12B",
  "6m": "1A", "7m": "2A", "8m": "3A", "9m": "4A", "10m": "5A", "11m": "6A",
  "12m": "7A", "1m": "8A", "2m": "9A", "3m": "10A", "4m": "11A", "5m": "12A",
  "6d": "1B", "7d": "2B", "8d": "3B", "9d": "4B", "10d": "5B", "11d": "6B",
  "12d": "7B", "1d": "8B", "2d": "9B", "3d": "10B", "4d": "11B", "5d": "12B",
  b: "1B", "f#": "2B", gb: "2B", db: "3B", "c#": "3B", ab: "4B", "g#": "4B",
  eb: "5B", "d#": "5B", bb: "6B", "a#": "6B", f: "7B", c: "8B", g: "9B",
  d: "10B", a: "11B", e: "12B",
  "g#m": "1A", abm: "1A", ebm: "2A", "d#m": "2A", bbm: "3A", "a#m": "3A",
  fm: "4A", cm: "5A", gm: "6A", dm: "7A", am: "8A", em: "9A", bm: "10A",
  "f#m": "11A", gbm: "11A", "c#m": "12A", dbm: "12A",
}

const CAMELOT_TO_TRAKTOR: Record<string, number> = {
  "8B": 0, "3B": 1, "10B": 2, "5B": 3, "12B": 4, "7B": 5,
  "2B": 6, "9B": 7, "4B": 8, "11B": 9, "6B": 10, "1B": 11,
  "5A": 12, "12A": 13, "7A": 14, "2A": 15, "9A": 16, "4A": 17,
  "11A": 18, "6A": 19, "1A": 20, "8A": 21, "3A": 22, "10A": 23,
}

const TRAKTOR_TO_CAMELOT: Record<number, string> = Object.fromEntries(
  Object.entries(CAMELOT_TO_TRAKTOR).map(([k, v]) => [v, k])
)

export function toCamelot(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const clean = raw.trim().toLowerCase().replace(/\s+/g, "").replace(/maj(or)?$/, "").replace(/min(or)?$/, "m")
  return KEY_TO_CAMELOT[clean]
}

export function rateTransition(kA?: string, kB?: string): WebTransitionRating {
  const cA = toCamelot(kA)
  const cB = toCamelot(kB)
  if (!cA || !cB) return "unknown"
  const nA = parseInt(cA.slice(0, -1), 10)
  const lA = cA.slice(-1)
  const nB = parseInt(cB.slice(0, -1), 10)
  const lB = cB.slice(-1)
  const diff = Math.min((nB - nA + 12) % 12, (nA - nB + 12) % 12)
  if (lA === lB && diff <= 1) return "perfect"
  if (nA === nB && lA !== lB) return "perfect"
  const fwd = (nB - nA + 12) % 12
  if (lA === lB && (fwd === 2 || fwd === 7)) return "energy"
  if (lA !== lB && diff === 1) return "energy"
  return "clash"
}

function decodeUriPath(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  const t = raw.trim()
  if (!t) return undefined
  if (!/^file:\/\//i.test(t)) return t
  let stripped = t.replace(/^file:\/\/localhost(?=\/)/i, "")
  if (stripped === t) stripped = t.replace(/^file:\/\//i, "")
  try {
    stripped = decodeURIComponent(stripped)
  } catch {
    // keep raw if malformed percent
  }
  return stripped.replace(/^\/([A-Za-z]:)/, "$1")
}

export async function decodeUploadedFile(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer())
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buf.subarray(2))
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buf.subarray(2))
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buf.subarray(3))
  }
  return new TextDecoder("utf-8").decode(buf)
}

export async function parseUploadedDjFile(file: File): Promise<WebParseOutput> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "crate") {
    return parseBrowserSeratoCrate(await file.arrayBuffer(), file.name)
  }
  const text = await decodeUploadedFile(file)
  return parseBrowserDjFile(text, file.name)
}

export function parseBrowserSeratoCrate(buf: ArrayBuffer, fileName: string): WebParseOutput {
  const bytes = new Uint8Array(buf)
  const view = new DataView(buf)
  const ascii = (start: number, len: number) =>
    String.fromCharCode(...bytes.subarray(start, start + len))

  if (bytes.length < 8 || ascii(0, 4) !== "vrsn") {
    throw new Error("Invalid Serato .crate file (missing vrsn header).")
  }

  const tracks: WebTrack[] = []
  let offset = 0
  while (offset + 8 <= bytes.length) {
    const tag = ascii(offset, 4)
    const len = view.getUint32(offset + 4, false)
    offset += 8
    if (offset + len > bytes.length) break
    if (tag === "otrk") {
      let sub = offset
      const end = offset + len
      while (sub + 8 <= end) {
        const stag = ascii(sub, 4)
        const slen = view.getUint32(sub + 4, false)
        sub += 8
        if (sub + slen > end) break
        if (stag === "ptrk") {
          const decoded = new TextDecoder("utf-16be").decode(bytes.subarray(sub, sub + slen)).replace(/\0+$/, "").trim()
          const loc = /^[A-Za-z]:\//.test(decoded) || decoded.startsWith("/") ? decoded : `/${decoded}`
          const stem = (loc.split(/[\\/]/).pop() ?? "").replace(/\.[^.]+$/, "")
          const dash = stem.indexOf(" - ")
          tracks.push({
            id: `serato-${tracks.length}`,
            artist: dash > 0 ? stem.slice(0, dash).trim() : "(unknown artist)",
            name: dash > 0 ? stem.slice(dash + 3).trim() : stem || "(untitled)",
            location: loc,
          })
        }
        sub += slen
      }
    }
    offset += len
  }

  const parts = fileName.replace(/\.crate$/i, "").split("%%").map((s) => s.trim()).filter(Boolean)
  const name = parts[parts.length - 1] || "Serato Crate"
  return {
    format: "Serato Crate",
    playlists: [{ id: "pl-0", name, folder: parts.slice(0, -1).join(" / "), tracks }],
    totalTracks: tracks.length,
  }
}

export function parseBrowserDjFile(content: string, fileName: string): WebParseOutput {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  const clean = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content

  if (ext === "xml") {
    if (/<VirtualDJ_Database\b|<VirtualFolder\b/i.test(clean)) {
      return parseBrowserVirtualDjXml(clean, fileName)
    }
    return parseBrowserRekordboxXml(clean)
  }
  if (ext === "vdjfolder") return parseBrowserVirtualDjXml(clean, fileName)
  if (ext === "nml") return parseBrowserTraktorNml(clean, fileName)
  if (ext === "m3u8" || ext === "m3u") return parseBrowserM3u8(clean, fileName)
  if (ext === "txt") return parseBrowserTxt(clean, fileName)
  if (ext === "csv") return parseBrowserCsv(clean, fileName)

  throw new Error(`Unsupported file format .${ext}. Use .xml, .nml, .crate, .vdjfolder, .m3u8, .m3u, .txt or .csv.`)
}

function parseBrowserVirtualDjXml(xml: string, fileName: string): WebParseOutput {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid VirtualDJ XML file.")
  }
  const tracks: WebTrack[] = []
  doc.querySelectorAll("Song").forEach((el, idx) => {
    const filePath = el.getAttribute("FilePath")?.replace(/\\/g, "/") || undefined
    const tags = el.querySelector("Tags")
    const infos = el.querySelector("Infos")
    const scan = el.querySelector("Scan")
    const fallback = filePath?.split("/").pop()?.replace(/\.[^.]+$/, "") ?? ""
    const tagBpm = parseFloat(tags?.getAttribute("Bpm") ?? "")
    const scanSpb = parseFloat(scan?.getAttribute("Bpm") ?? "")
    let bpm: number | undefined
    if (!isNaN(tagBpm) && tagBpm > 20) bpm = Math.round(tagBpm * 100) / 100
    else if (!isNaN(scanSpb) && scanSpb > 0.1 && scanSpb < 3) bpm = Math.round((60 / scanSpb) * 100) / 100
    const dur = parseFloat(infos?.getAttribute("SongLength") ?? "")
    const cues: WebCuePoint[] = []
    el.querySelectorAll("Poi").forEach((poi) => {
      const t = (poi.getAttribute("Type") ?? "").toLowerCase()
      const pos = parseFloat(poi.getAttribute("Pos") ?? "")
      if (isNaN(pos) || (t !== "cue" && t !== "loop")) return
      const size = parseFloat(poi.getAttribute("Size") ?? "0")
      const isLoop = t === "loop" || size > 0
      cues.push({
        name: poi.getAttribute("Name") || undefined,
        type: isLoop ? 4 : 0,
        startMs: Math.round(pos * 1000),
        endMs: isLoop && size > 0 ? Math.round((pos + size) * 1000) : undefined,
        hotCueIndex: parseInt(poi.getAttribute("Num") ?? "0", 10) - 1,
      })
    })
    tracks.push({
      id: `vdj-${idx}`,
      name: tags?.getAttribute("Title") || fallback || "(untitled)",
      artist: tags?.getAttribute("Author") || "(unknown artist)",
      album: tags?.getAttribute("Album") || undefined,
      genre: tags?.getAttribute("Genre") || undefined,
      bpm,
      key: scan?.getAttribute("Key") || tags?.getAttribute("Key") || undefined,
      durationSeconds: isNaN(dur) ? undefined : dur,
      location: filePath,
      cuePoints: cues.length > 0 ? cues : undefined,
    })
  })
  const name = fileName.replace(/\.[^.]+$/, "") || "VirtualDJ"
  return { format: "VirtualDJ XML", playlists: [{ id: "pl-0", name, folder: "", tracks }], totalTracks: tracks.length }
}

function parseBrowserRekordboxXml(xml: string): WebParseOutput {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (doc.querySelector("parsererror") || !doc.querySelector("DJ_PLAYLISTS")) {
    throw new Error("Invalid Rekordbox XML file (missing DJ_PLAYLISTS).")
  }

  const byId = new Map<string, WebTrack>()
  const byLoc = new Map<string, WebTrack>()

  doc.querySelectorAll("COLLECTION > TRACK").forEach((el, idx) => {
    const id = el.getAttribute("TrackID") ?? String(idx + 1)
    const rawLoc = el.getAttribute("Location")
    const location = decodeUriPath(rawLoc)
    const cues: WebCuePoint[] = []
    el.querySelectorAll("POSITION_MARK").forEach((m) => {
      const start = parseFloat(m.getAttribute("Start") ?? "")
      if (isNaN(start)) return
      const end = parseFloat(m.getAttribute("End") ?? "")
      cues.push({
        name: m.getAttribute("Name") || undefined,
        type: parseInt(m.getAttribute("Type") ?? "0", 10) || 0,
        startMs: Math.round(start * 1000),
        endMs: isNaN(end) ? undefined : Math.round(end * 1000),
        hotCueIndex: parseInt(m.getAttribute("Num") ?? "-1", 10),
      })
    })
    const bpm = parseFloat(el.getAttribute("AverageBpm") ?? "")
    const dur = parseFloat(el.getAttribute("TotalTime") ?? "")
    const track: WebTrack = {
      id: `rb-${id}-${idx}`,
      name: el.getAttribute("Name") || "(untitled)",
      artist: el.getAttribute("Artist") || "(unknown artist)",
      album: el.getAttribute("Album") || undefined,
      genre: el.getAttribute("Genre") || undefined,
      bpm: isNaN(bpm) ? undefined : bpm,
      key: el.getAttribute("Tonality") || undefined,
      durationSeconds: isNaN(dur) ? undefined : dur,
      location,
      cuePoints: cues.length > 0 ? cues : undefined,
    }
    byId.set(id, track)
    if (rawLoc) byLoc.set(rawLoc, track)
    if (location) byLoc.set(location.toLowerCase(), track)
  })

  const playlists: WebPlaylist[] = []
  const walk = (node: Element, folderParts: string[]) => {
    const type = node.getAttribute("Type")
    const name = node.getAttribute("Name") ?? "Playlist"
    if (type === "0") {
      const nextFolder = name === "ROOT" ? folderParts : [...folderParts, name]
      Array.from(node.children)
        .filter((c) => c.tagName === "NODE")
        .forEach((child) => walk(child, nextFolder))
    } else if (type === "1") {
      const keyType = node.getAttribute("KeyType") ?? "0"
      const tracks: WebTrack[] = []
      Array.from(node.children)
        .filter((c) => c.tagName === "TRACK")
        .forEach((ref) => {
          const key = ref.getAttribute("Key") ?? ""
          const found =
            keyType === "1"
              ? byLoc.get(key) ?? byLoc.get((decodeUriPath(key) ?? "").toLowerCase())
              : byId.get(key)
          if (found) tracks.push(found)
        })
      playlists.push({
        id: `pl-${playlists.length}`,
        name,
        folder: folderParts.join(" / "),
        tracks,
      })
    }
  }

  const rootNodes = doc.querySelectorAll("PLAYLISTS > NODE")
  rootNodes.forEach((n) => walk(n, []))

  return { format: "Rekordbox XML", playlists, totalTracks: byId.size }
}

function parseBrowserTraktorNml(xml: string, fileName: string): WebParseOutput {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (doc.querySelector("parsererror") || !doc.querySelector("NML")) {
    throw new Error("Invalid Traktor NML file (missing <NML>).")
  }

  const byKey = new Map<string, WebTrack>()
  const allTracks: WebTrack[] = []

  doc.querySelectorAll("COLLECTION > ENTRY").forEach((el, idx) => {
    const loc = el.querySelector("LOCATION")
    const info = el.querySelector("INFO")
    const tempo = el.querySelector("TEMPO")
    const album = el.querySelector("ALBUM")
    const mk = el.querySelector("MUSICAL_KEY")

    const vol = loc?.getAttribute("VOLUME") ?? ""
    const dir = loc?.getAttribute("DIR") ?? ""
    const file = loc?.getAttribute("FILE") ?? ""
    const pk = `${vol}${dir}${file}`
    const cleanDir = dir.split("/:").map((s) => s.trim()).filter(Boolean).join("/")
    const location = file
      ? /^[A-Za-z]:$/.test(vol)
        ? cleanDir ? `${vol}/${cleanDir}/${file}` : `${vol}/${file}`
        : cleanDir ? `/${cleanDir}/${file}` : `/${file}`
      : undefined

    const mkVal = parseInt(mk?.getAttribute("VALUE") ?? "", 10)
    const key = info?.getAttribute("KEY") || (!isNaN(mkVal) ? TRAKTOR_TO_CAMELOT[mkVal] : undefined)
    const bpm = parseFloat(tempo?.getAttribute("BPM") ?? "")
    const dur = parseFloat(info?.getAttribute("PLAYTIME_FLOAT") ?? info?.getAttribute("PLAYTIME") ?? "")

    const cues: WebCuePoint[] = []
    el.querySelectorAll("CUE_V2").forEach((c) => {
      const start = parseFloat(c.getAttribute("START") ?? "")
      const tType = parseInt(c.getAttribute("TYPE") ?? "0", 10)
      if (isNaN(start) || tType === 4) return
      const len = parseFloat(c.getAttribute("LEN") ?? "0")
      cues.push({
        name: c.getAttribute("NAME") || undefined,
        type: tType === 5 ? 4 : tType,
        startMs: Math.round(start),
        endMs: tType === 5 && len > 0 ? Math.round(start + len) : undefined,
        hotCueIndex: parseInt(c.getAttribute("HOTCUE") ?? "-1", 10),
      })
    })

    const track: WebTrack = {
      id: `nml-${idx}`,
      name: el.getAttribute("TITLE") || file.replace(/\.[^.]+$/, "") || "(untitled)",
      artist: el.getAttribute("ARTIST") || "(unknown artist)",
      album: album?.getAttribute("TITLE") || undefined,
      genre: info?.getAttribute("GENRE") || undefined,
      bpm: isNaN(bpm) ? undefined : bpm,
      key,
      durationSeconds: isNaN(dur) ? undefined : dur,
      location,
      cuePoints: cues.length > 0 ? cues : undefined,
    }
    allTracks.push(track)
    if (pk) {
      byKey.set(pk, track)
      byKey.set(pk.toLowerCase(), track)
    }
  })

  const playlists: WebPlaylist[] = []
  const walk = (node: Element, folderParts: string[]) => {
    const type = (node.getAttribute("TYPE") ?? "").toUpperCase()
    const name = node.getAttribute("NAME") ?? "Playlist"
    if (type === "FOLDER") {
      const next = name === "$ROOT" ? folderParts : [...folderParts, name]
      const sub = node.querySelector(":scope > SUBNODES") ?? node
      Array.from(sub.children)
        .filter((c) => c.tagName === "NODE")
        .forEach((child) => walk(child, next))
    } else if (type === "PLAYLIST") {
      const tracks: WebTrack[] = []
      node.querySelectorAll("PRIMARYKEY").forEach((pk) => {
        const key = pk.getAttribute("KEY") ?? ""
        const found = byKey.get(key) ?? byKey.get(key.toLowerCase())
        if (found) tracks.push(found)
      })
      playlists.push({
        id: `pl-${playlists.length}`,
        name,
        folder: folderParts.join(" / "),
        tracks,
      })
    }
  }
  doc.querySelectorAll("PLAYLISTS > NODE").forEach((n) => walk(n, []))

  if (playlists.length === 0 && allTracks.length > 0) {
    playlists.push({
      id: "pl-0",
      name: fileName.replace(/\.[^.]+$/, ""),
      folder: "",
      tracks: allTracks,
    })
  }

  return { format: "Traktor NML", playlists, totalTracks: allTracks.length }
}

function parseBrowserM3u8(content: string, fileName: string): WebParseOutput {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const tracks: WebTrack[] = []
  let dur: number | undefined
  let disp: string | undefined

  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      const rest = line.slice(8)
      const comma = rest.indexOf(",")
      if (comma >= 0) {
        const d = parseFloat(rest.slice(0, comma))
        dur = isNaN(d) || d < 0 ? undefined : d
        disp = rest.slice(comma + 1).trim()
      }
      continue
    }
    if (line.startsWith("#")) continue
    const loc = decodeUriPath(line) ?? line
    const fallbackName = (loc.split(/[\\/]/).pop() ?? "").replace(/\.[^.]+$/, "")
    const label = disp || fallbackName
    const dash = label.indexOf(" - ")
    tracks.push({
      id: `m3u-${tracks.length}`,
      artist: dash > 0 ? label.slice(0, dash).trim() : "(unknown artist)",
      name: dash > 0 ? label.slice(dash + 3).trim() : label || "(untitled)",
      durationSeconds: dur,
      location: loc,
    })
    dur = undefined
    disp = undefined
  }

  return {
    format: "M3U8 Playlist",
    playlists: [{ id: "pl-0", name: fileName.replace(/\.[^.]+$/, ""), folder: "", tracks }],
    totalTracks: tracks.length,
  }
}

function parseBrowserTxt(content: string, fileName: string): WebParseOutput {
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error("Empty TXT file.")
  const sep = lines[0].includes("\t") ? "\t" : ";"
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase())
  const col = (...names: string[]) => names.map((n) => headers.indexOf(n)).find((i) => i !== -1) ?? -1
  const cTitle = col("track title", "title", "título de pista", "título")
  const cArtist = col("artist", "artista")
  const cBpm = col("bpm")
  const cKey = col("tonality", "key", "tonalidad")
  const cTime = col("total time", "duration", "tiempo")
  const cLoc = col("location", "ubicación")

  const tracks: WebTrack[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim())
    const name = cTitle >= 0 ? cells[cTitle] ?? "" : ""
    const artist = cArtist >= 0 ? cells[cArtist] ?? "" : ""
    if (!name && !artist) continue
    const bpm = cBpm >= 0 ? parseFloat((cells[cBpm] ?? "").replace(",", ".")) : NaN
    let durationSeconds: number | undefined
    if (cTime >= 0 && cells[cTime]) {
      const parts = cells[cTime].split(":").map((p) => parseInt(p, 10))
      if (parts.length === 2 && !parts.some(isNaN)) durationSeconds = parts[0] * 60 + parts[1]
      else if (parts.length === 3 && !parts.some(isNaN)) durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    tracks.push({
      id: `txt-${i}`,
      name: name || "(untitled)",
      artist: artist || "(unknown artist)",
      bpm: isNaN(bpm) ? undefined : bpm,
      key: cKey >= 0 ? cells[cKey] || undefined : undefined,
      durationSeconds,
      location: cLoc >= 0 ? decodeUriPath(cells[cLoc]) : undefined,
    })
  }

  return {
    format: "Rekordbox TXT",
    playlists: [{ id: "pl-0", name: fileName.replace(/\.[^.]+$/, ""), folder: "", tracks }],
    totalTracks: tracks.length,
  }
}

function parseBrowserCsv(content: string, fileName: string): WebParseOutput {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? ""
  const delim = (firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length ? ";" : ","
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQ = false
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const next = content[i + 1]
    if (inQ) {
      if (ch === '"' && next === '"') { cell += '"'; i++ }
      else if (ch === '"') inQ = false
      else cell += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === delim) { row.push(cell); cell = "" }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && next === "\n") i++
        row.push(cell)
        if (row.some((c) => c.trim())) rows.push(row)
        row = []
        cell = ""
      } else cell += ch
    }
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  if (rows.length < 2) throw new Error("Empty CSV file.")

  const hdr = rows[0].map((h) => h.trim().toLowerCase())
  const col = (...names: string[]) => names.map((n) => hdr.indexOf(n)).find((i) => i !== -1) ?? -1
  const cTitle = col("track name", "title", "track title", "name", "título")
  const cArtist = col("artist name(s)", "artist name", "artist", "artists", "artista")
  const cAlbum = col("album name", "album")
  const cBpm = col("tempo", "bpm")
  const cKey = col("key", "tonality")
  const cDurMs = col("duration (ms)", "duration_ms")
  const cDurS = col("duration_seconds", "duration_s", "duration")
  const cLoc = col("location", "path")

  const tracks: WebTrack[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const g = (idx: number) => (idx >= 0 && idx < r.length ? r[idx].trim() : "")
    const name = g(cTitle)
    const artist = g(cArtist).replace(/;/g, ", ")
    if (!name && !artist) continue
    const bpm = parseFloat(g(cBpm).replace(",", "."))
    let durationSeconds: number | undefined
    if (cDurMs >= 0 && g(cDurMs)) {
      const ms = parseFloat(g(cDurMs))
      if (!isNaN(ms) && ms > 0) durationSeconds = Math.round(ms / 1000)
    } else if (cDurS >= 0 && g(cDurS)) {
      const s = parseFloat(g(cDurS))
      if (!isNaN(s) && s > 0) durationSeconds = s > 10000 ? Math.round(s / 1000) : Math.round(s)
    }
    tracks.push({
      id: `csv-${i}`,
      name: name || "(untitled)",
      artist: artist || "(unknown artist)",
      album: g(cAlbum) || undefined,
      bpm: !isNaN(bpm) && bpm > 0 ? Math.round(bpm * 100) / 100 : undefined,
      key: g(cKey) || undefined,
      durationSeconds,
      location: decodeUriPath(g(cLoc)),
    })
  }

  return {
    format: "Streaming CSV",
    playlists: [{ id: "pl-0", name: fileName.replace(/\.[^.]+$/, ""), folder: "", tracks }],
    totalTracks: tracks.length,
  }
}

export function analyzeWebPlaylist(playlist: WebPlaylist): WebAnalytics {
  const bpms: number[] = []
  let totalDurationSeconds = 0
  let totalCues = 0
  const keyMap = new Map<string, number>()
  const seenSig = new Set<string>()
  let duplicateCount = 0

  for (const t of playlist.tracks) {
    if (t.durationSeconds && t.durationSeconds > 0) totalDurationSeconds += t.durationSeconds
    if (t.bpm && t.bpm > 0) bpms.push(t.bpm)
    if (t.cuePoints) totalCues += t.cuePoints.length
    const cam = toCamelot(t.key)
    if (cam) keyMap.set(cam, (keyMap.get(cam) ?? 0) + 1)
    const sig = `${t.artist.toLowerCase().trim()}||${t.name.toLowerCase().replace(/\([^)]*\)/g, "").trim()}`
    if (seenSig.has(sig)) duplicateCount++
    else seenSig.add(sig)
  }

  bpms.sort((a, b) => a - b)
  let perfectCount = 0
  let energyCount = 0
  let clashCount = 0
  const transitions: WebAnalytics["transitions"] = []

  for (let i = 0; i < playlist.tracks.length - 1; i++) {
    const a = playlist.tracks[i]
    const b = playlist.tracks[i + 1]
    const rating = rateTransition(a.key, b.key)
    if (rating === "perfect") perfectCount++
    else if (rating === "energy") energyCount++
    else if (rating === "clash") clashCount++
    transitions.push({ rating, fromKey: toCamelot(a.key) ?? a.key, toKey: toCamelot(b.key) ?? b.key })
  }

  const known = perfectCount + energyCount + clashCount
  const harmonicScore = known > 0 ? Math.round(((perfectCount + energyCount * 0.85) / known) * 100) : null

  return {
    totalTracks: playlist.tracks.length,
    totalDurationSeconds,
    bpmMin: bpms.length ? Math.round(bpms[0] * 10) / 10 : undefined,
    bpmMax: bpms.length ? Math.round(bpms[bpms.length - 1] * 10) / 10 : undefined,
    bpmAvg: bpms.length ? Math.round((bpms.reduce((s, v) => s + v, 0) / bpms.length) * 10) / 10 : undefined,
    harmonicScore,
    perfectCount,
    energyCount,
    clashCount,
    transitions,
    duplicateCount,
    totalCues,
    topKeys: Array.from(keyMap.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
  }
}

export function cleanWebPlaylistMetadata(playlist: WebPlaylist): { playlist: WebPlaylist; cleaned: number } {
  const noise = [
    /\[(free\s*(download|dl)|promo|master|hq|wav|flac|320\s*kbps|out\s*now)\]/gi,
    /\((free\s*(download|dl)|320\s*kbps|master|mastered|hq|official\s*(audio|video))\)/gi,
    /\bwww\.[a-z0-9.-]+\.[a-z]{2,}\b/gi,
    /\.(mp3|wav|flac|aiff|aif|ogg|m4a)$/gi,
  ]
  const cleanStr = (s: string) => {
    let o = s
    noise.forEach((rx) => { o = o.replace(rx, "") })
    if (o.includes("_") && !o.includes(" ")) o = o.replace(/_+/g, " ")
    return o.replace(/\s+/g, " ").trim()
  }
  let cleaned = 0
  const tracks = playlist.tracks.map((t) => {
    let name = cleanStr(t.name)
    let artist = cleanStr(t.artist)
    let key = t.key
    let changed = name !== t.name || artist !== t.artist
    if ((!artist || artist === "(unknown artist)") && name.includes(" - ")) {
      const i = name.indexOf(" - ")
      artist = name.slice(0, i).trim()
      name = name.slice(i + 3).trim()
      changed = true
    }
    const cam = toCamelot(key)
    if (cam && cam !== key) {
      key = cam
      changed = true
    }
    if (changed) cleaned++
    return { ...t, name: name || t.name, artist: artist || t.artist, key }
  })
  return { playlist: { ...playlist, tracks }, cleaned }
}

export function fixWebHalfDoubleBpm(playlist: WebPlaylist): { playlist: WebPlaylist; fixed: number } {
  const bpms = playlist.tracks.map((t) => t.bpm).filter((b): b is number => Boolean(b && b > 0)).sort((a, b) => a - b)
  if (bpms.length < 3) return { playlist, fixed: 0 }
  const median = bpms[Math.floor(bpms.length / 2)]
  let fixed = 0
  const tracks = playlist.tracks.map((t) => {
    if (!t.bpm) return t
    const currD = Math.abs(t.bpm - median) / median
    const dblD = Math.abs(t.bpm * 2 - median) / median
    const halfD = Math.abs(t.bpm / 2 - median) / median
    if (currD > 0.25 && dblD <= 0.16) { fixed++; return { ...t, bpm: Math.round(t.bpm * 200) / 100 } }
    if (currD > 0.25 && halfD <= 0.16) { fixed++; return { ...t, bpm: Math.round(t.bpm * 50) / 100 } }
    return t
  })
  return { playlist: { ...playlist, tracks }, fixed }
}

export function exportWebHtmlPrepSheet(playlist: WebPlaylist): string {
  const stats = analyzeWebPlaylist(playlist)
  const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`
  let elapsed = 0
  const rows = playlist.tracks.map((t, i) => {
    const ts = fmt(elapsed)
    elapsed += t.durationSeconds ?? 0
    return `<tr><td>${String(i + 1).padStart(2, "0")}</td><td>${ts}</td><td><strong>${escXml(t.name)}</strong><br><small>${escXml(t.artist)}</small></td><td>${t.bpm ? Math.round(t.bpm) : "—"}</td><td>${escXml(toCamelot(t.key) ?? t.key ?? "—")}</td></tr>`
  }).join("")
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escXml(playlist.name)} — FZR Booth Prep</title><style>body{background:#07080d;color:#eef2fa;font-family:system-ui,sans-serif;padding:28px}table{width:100%;border-collapse:collapse;background:#101420}th,td{padding:10px;border-bottom:1px solid #232a3d;text-align:left}small{color:#8a94ac}@media print{body{background:#fff;color:#111}table{background:#fff}}</style></head><body><h1>${escXml(playlist.name)}</h1><p>${stats.totalTracks} tracks · ${stats.bpmMin ?? "—"}–${stats.bpmMax ?? "—"} BPM · Camelot ${stats.harmonicScore ?? "—"}%</p><table><thead><tr><th>#</th><th>Time</th><th>Track</th><th>BPM</th><th>Key</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
}

export function sortWebPlaylistHarmonically(playlist: WebPlaylist): WebPlaylist {
  if (playlist.tracks.length <= 2) return playlist
  const rem = [...playlist.tracks].sort((a, b) => (a.bpm ?? 999) - (b.bpm ?? 999))
  const ordered: WebTrack[] = [rem.shift()!]

  while (rem.length > 0) {
    const curr = ordered[ordered.length - 1]
    let bestIdx = 0
    let bestCost = Number.POSITIVE_INFINITY
    for (let i = 0; i < rem.length; i++) {
      const c = rem[i]
      const r = rateTransition(curr.key, c.key)
      const kCost = r === "perfect" ? 0 : r === "energy" ? 6 : r === "unknown" ? 12 : 30
      let bCost = 5
      if (curr.bpm && c.bpm) {
        const d = c.bpm - curr.bpm
        bCost = d >= 0 && d <= 4 ? d * 0.8 : Math.abs(d) * 2.2
      }
      if (kCost + bCost < bestCost) {
        bestCost = kCost + bCost
        bestIdx = i
      }
    }
    ordered.push(rem.splice(bestIdx, 1)[0])
  }

  return { ...playlist, tracks: ordered }
}

export function deduplicateWebPlaylist(playlist: WebPlaylist): WebPlaylist {
  const seen = new Set<string>()
  const unique = playlist.tracks.filter((t) => {
    const sig = `${t.artist.toLowerCase().trim()}||${t.name.toLowerCase().replace(/\([^)]*\)/g, "").trim()}`
    if (seen.has(sig)) return false
    seen.add(sig)
    return true
  })
  return { ...playlist, tracks: unique }
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function exportWebM3u8(playlist: WebPlaylist): string {
  const lines = ["#EXTM3U", `#PLAYLIST:${playlist.name}`, ""]
  for (const t of playlist.tracks) {
    lines.push(`#EXTINF:${t.durationSeconds ? Math.round(t.durationSeconds) : -1},${t.artist} - ${t.name}`)
    lines.push(t.location ? t.location.replace(/\\/g, "/") : `# MISSING: ${t.artist} - ${t.name}`)
    lines.push("")
  }
  return lines.join("\n")
}

export function exportWebNml(playlist: WebPlaylist): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`
  const uniqueEntries = new Map<string, string>()
  const pks: string[] = []

  playlist.tracks.forEach((t, idx) => {
    const norm = (t.location ?? "").replace(/\\/g, "/")
    let vol = ""
    let rest = norm
    const win = norm.match(/^([A-Za-z]:)\/?(.*)$/)
    if (win) {
      vol = win[1].toUpperCase()
      rest = win[2]
    }
    const segs = rest.split("/").filter(Boolean)
    const file = segs.pop() ?? ""
    const dir = segs.length > 0 ? `/:${segs.join("/:")}/:` : "/:"
    const pk = file ? `${vol}${dir}${file}` : `MISSING_${idx}`
    pks.push(`            <PRIMARYKEY TYPE="TRACK" KEY="${escXml(pk)}"/>`)
    if (uniqueEntries.has(pk)) return

    const cam = toCamelot(t.key)
    const trkKey = cam ? CAMELOT_TO_TRAKTOR[cam] : undefined
    const lines = [
      `      <LOCATION DIR="${escXml(dir)}" FILE="${escXml(file)}" VOLUME="${escXml(vol)}" VOLUMEID="${escXml(vol)}"/>`,
    ]
    if (t.album) lines.push(`      <ALBUM TITLE="${escXml(t.album)}"/>`)
    lines.push(
      `      <INFO${t.genre ? ` GENRE="${escXml(t.genre)}"` : ""}${t.key ? ` KEY="${escXml(t.key)}"` : ""}${t.durationSeconds ? ` PLAYTIME="${Math.round(t.durationSeconds)}"` : ""} IMPORT_DATE="${dateStr}" FLAGS="10"/>`
    )
    if (t.bpm) lines.push(`      <TEMPO BPM="${t.bpm.toFixed(6)}" BPM_QUALITY="100.000000"/>`)
    if (trkKey !== undefined) lines.push(`      <MUSICAL_KEY VALUE="${trkKey}"/>`)
    if (t.cuePoints) {
      t.cuePoints.forEach((c, ci) => {
        const len = c.type === 4 && c.endMs ? c.endMs - c.startMs : 0
        lines.push(
          `      <CUE_V2 NAME="${escXml(c.name ?? "")}" DISPL_ORDER="${ci}" TYPE="${c.type === 4 ? 5 : c.type}" START="${c.startMs.toFixed(6)}" LEN="${len.toFixed(6)}" REPEATS="-1" HOTCUE="${c.hotCueIndex ?? -1}"/>`
        )
      })
    }
    uniqueEntries.set(
      pk,
      `    <ENTRY MODIFIED_DATE="${dateStr}" MODIFIED_TIME="0" LOCK="0" TITLE="${escXml(t.name)}" ARTIST="${escXml(t.artist)}">\n${lines.join("\n")}\n    </ENTRY>`
    )
  })

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n<NML VERSION="19">\n  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"/>\n  <MUSICFOLDERS/>\n  <COLLECTION ENTRIES="${uniqueEntries.size}">\n${Array.from(uniqueEntries.values()).join("\n")}\n  </COLLECTION>\n  <SETS ENTRIES="0"/>\n  <PLAYLISTS>\n    <NODE TYPE="FOLDER" NAME="$ROOT">\n      <SUBNODES COUNT="1">\n        <NODE TYPE="PLAYLIST" NAME="${escXml(playlist.name)}">\n          <PLAYLIST ENTRIES="${playlist.tracks.length}" TYPE="LIST" UUID="fzr-web-export">\n${pks.join("\n")}\n          </PLAYLIST>\n        </NODE>\n      </SUBNODES>\n    </NODE>\n  </PLAYLISTS>\n</NML>\n`
}

export function exportWebRekordboxXml(playlist: WebPlaylist): string {
  const trackNodes = playlist.tracks.map((t, idx) => {
    const id = idx + 1
    const locAttr = t.location
      ? ` Location="${escXml(`file://localhost/${t.location.replace(/\\/g, "/").replace(/^\//, "").split("/").map((s, i) => (i === 0 && /^[A-Za-z]:$/.test(s) ? s : encodeURIComponent(s))).join("/")}`)}"`
      : ""
    return `    <TRACK TrackID="${id}" Name="${escXml(t.name)}" Artist="${escXml(t.artist)}"${t.bpm ? ` AverageBpm="${t.bpm.toFixed(2)}"` : ""}${t.key ? ` Tonality="${escXml(t.key)}"` : ""}${t.durationSeconds ? ` TotalTime="${Math.round(t.durationSeconds)}"` : ""}${locAttr}/>`
  })
  const refs = playlist.tracks.map((_, idx) => `        <TRACK Key="${idx + 1}"/>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<DJ_PLAYLISTS Version="1.0.0">\n  <PRODUCT Name="FZR Rekordbox Exporter Web" Version="1.3.0" Company="FZR"/>\n  <COLLECTION Entries="${playlist.tracks.length}">\n${trackNodes.join("\n")}\n  </COLLECTION>\n  <PLAYLISTS>\n    <NODE Type="0" Name="ROOT" Count="1">\n      <NODE Name="${escXml(playlist.name)}" Type="1" KeyType="0" Entries="${playlist.tracks.length}">\n${refs.join("\n")}\n      </NODE>\n    </NODE>\n  </PLAYLISTS>\n</DJ_PLAYLISTS>\n`
}

export function exportWebSetlistTxt(playlist: WebPlaylist): string {
  let elapsed = 0
  const fmt = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  const lines = [playlist.name, "=".repeat(Math.max(16, playlist.name.length)), ""]
  playlist.tracks.forEach((t, i) => {
    const meta = [t.bpm ? `${Math.round(t.bpm)} BPM` : "", toCamelot(t.key) ?? t.key ?? ""].filter(Boolean)
    lines.push(`${String(i + 1).padStart(2, "0")}. [${fmt(elapsed)}] ${t.artist} - ${t.name}${meta.length ? ` [${meta.join(" | ")}]` : ""}`)
    elapsed += t.durationSeconds ?? 0
  })
  return lines.join("\r\n") + "\r\n"
}

export function exportWebStreamingCsv(playlist: WebPlaylist): string {
  const esc = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v)
  const rows = playlist.tracks.map((t) =>
    [esc(t.name), esc(t.artist), esc(t.album ?? ""), t.durationSeconds ? Math.round(t.durationSeconds) : "", t.bpm ? Math.round(t.bpm) : "", toCamelot(t.key) ?? t.key ?? ""].join(",")
  )
  return "\uFEFF" + ["title,artist,album,duration_seconds,bpm,key", ...rows].join("\r\n") + "\r\n"
}

export function exportWebCueSheet(playlist: WebPlaylist): string {
  const q = (s: string) => s.replace(/"/g, "'")
  const lines = [
    `REM GENERATOR "FZR Rekordbox Exporter Web v1.4.0"`,
    `TITLE "${q(playlist.name)}"`,
    `FILE "${q(playlist.name)}.wav" WAVE`,
  ]
  let elapsed = 0
  playlist.tracks.forEach((t, idx) => {
    const mins = Math.floor(elapsed / 60)
    const secs = Math.floor(elapsed % 60)
    lines.push(`  TRACK ${String(idx + 1).padStart(2, "0")} AUDIO`)
    lines.push(`    TITLE "${q(t.name)}"`)
    lines.push(`    PERFORMER "${q(t.artist)}"`)
    if (t.bpm) lines.push(`    REM BPM ${Math.round(t.bpm)}`)
    const cam = toCamelot(t.key) ?? t.key
    if (cam) lines.push(`    REM KEY ${cam}`)
    lines.push(`    INDEX 01 ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:00`)
    elapsed += t.durationSeconds ?? 0
  })
  return lines.join("\r\n") + "\r\n"
}

export function remapWebPlaylistPaths(
  playlist: WebPlaylist,
  fromPrefix: string,
  toPrefix: string
): { playlist: WebPlaylist; count: number } {
  const nf = fromPrefix.replace(/\\/g, "/").replace(/\/+$/, "")
  const nt = toPrefix.replace(/\\/g, "/").replace(/\/+$/, "")
  if (!nf) return { playlist, count: 0 }
  const lf = nf.toLowerCase()
  let count = 0
  const tracks = playlist.tracks.map((t) => {
    if (!t.location) return t
    const norm = t.location.replace(/\\/g, "/")
    if (norm.toLowerCase().startsWith(lf)) {
      const rest = norm.slice(nf.length)
      if (rest === "" || rest.startsWith("/")) {
        count++
        return { ...t, location: `${nt}${rest}` }
      }
    }
    return t
  })
  return { playlist: { ...playlist, tracks }, count }
}

export function splitWebPlaylistByBpm(playlist: WebPlaylist): WebPlaylist[] {
  const zones = [
    { label: "Warm-Up (<124 BPM)", min: 0, max: 123.99 },
    { label: "Groove (124-131 BPM)", min: 124, max: 131.99 },
    { label: "Peak Time (132-139 BPM)", min: 132, max: 139.99 },
    { label: "Hard (140+ BPM)", min: 140, max: 999 },
  ]
  const out: WebPlaylist[] = []
  zones.forEach((z, zi) => {
    const list = playlist.tracks.filter((t) => t.bpm && t.bpm >= z.min && t.bpm <= z.max)
    if (list.length > 0) {
      out.push({
        id: `${playlist.id}-z${zi}`,
        name: `${playlist.name} — ${z.label}`,
        folder: playlist.folder,
        tracks: list,
      })
    }
  })
  return out
}

export const DEMO_SET: WebParseOutput = {
  format: "Demo Rekordbox XML",
  totalTracks: 7,
  playlists: [
    {
      id: "demo-1",
      name: "Berlin Peak Time Techno 2026",
      folder: "Club Sets / Techno",
      tracks: [
        { id: "d1", artist: "Amelie Lens", name: "Feel It (Original Mix)", bpm: 136, key: "8A", durationSeconds: 372, location: "C:/Music/Techno/Amelie Lens - Feel It.wav", cuePoints: [{ name: "Drop", type: 0, startMs: 32000, hotCueIndex: 0 }] },
        { id: "d2", artist: "Charlotte de Witte", name: "Doppler (Extended Mix)", bpm: 138, key: "1A", durationSeconds: 398, location: "C:/Music/Techno/Charlotte de Witte - Doppler.flac", cuePoints: [{ name: "Break", type: 0, startMs: 120000, hotCueIndex: 0 }, { name: "Loop", type: 4, startMs: 240000, endMs: 248000, hotCueIndex: 1 }] },
        { id: "d3", artist: "Dax J", name: "Imperial Propaganda", bpm: 141, key: "9A", durationSeconds: 354, location: "C:/Music/Techno/Dax J - Imperial Propaganda.mp3" },
        { id: "d4", artist: "999999999", name: "X0004000X", bpm: 142, key: "8A", durationSeconds: 331, location: "C:/Music/Techno/999999999 - X0004000X.wav" },
        { id: "d5", artist: "Indira Paganotto", name: "Diabla (Extended)", bpm: 140, key: "10A", durationSeconds: 365, location: "C:/Music/Techno/Indira Paganotto - Diabla.mp3" },
        { id: "d6", artist: "Klangkuenstler", name: "Weltschmerz", bpm: 144, key: "9A", durationSeconds: 389, location: "C:/Music/Techno/Klangkuenstler - Weltschmerz.wav" },
        { id: "d7", artist: "Amelie Lens", name: "Feel It (Radio Edit)", bpm: 136, key: "8A", durationSeconds: 215, location: "C:/Music/Techno/Amelie Lens - Feel It (Radio).mp3" },
      ],
    },
  ],
}

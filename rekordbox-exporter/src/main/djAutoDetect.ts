import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { basename, join } from 'path'
import { homedir } from 'os'
import type {
  DetectedDjEnvironment,
  DetectedDjSoftware,
  DetectedLibraryFile,
  ParseResult,
  Playlist,
  Track
} from '../core/common/types'
import { parseSeratoCrate } from '../core/serato/parseSeratoCrate'

export type AutoDetectRoots = {
  homeDir: string
  appDataDir: string
  localAppDataDir: string
  documentsDir: string
  musicDir: string
  desktopDir: string
  downloadsDir: string
  programFilesDirs: string[]
}

export function getDefaultWindowsRoots(): AutoDetectRoots {
  const home = homedir()
  const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming')
  const localAppData = process.env.LOCALAPPDATA || join(home, 'AppData', 'Local')
  const programFiles = [
    process.env.ProgramFiles || 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  ].filter(Boolean)

  return {
    homeDir: home,
    appDataDir: appData,
    localAppDataDir: localAppData,
    documentsDir: join(home, 'Documents'),
    musicDir: join(home, 'Music'),
    desktopDir: join(home, 'Desktop'),
    downloadsDir: join(home, 'Downloads'),
    programFilesDirs: Array.from(new Set(programFiles))
  }
}

function getCandidateDocDirs(roots: AutoDetectRoots): string[] {
  const dirs = [
    roots.documentsDir,
    join(roots.homeDir, 'OneDrive', 'Documents'),
    join(roots.homeDir, 'OneDrive', 'Documentos')
  ]
  return Array.from(new Set(dirs)).filter((d) => existsSync(d))
}

function getCandidateMusicDirs(roots: AutoDetectRoots): string[] {
  const dirs = [
    roots.musicDir,
    join(roots.homeDir, 'OneDrive', 'Music'),
    join(roots.homeDir, 'OneDrive', 'Música')
  ]
  return Array.from(new Set(dirs)).filter((d) => existsSync(d))
}

function toLibraryFile(
  filePath: string,
  label: string,
  software: DetectedLibraryFile['software']
): DetectedLibraryFile | null {
  try {
    if (!existsSync(filePath)) return null
    const st = statSync(filePath)
    if (!st.isFile() || st.size === 0) return null
    return {
      path: filePath,
      label,
      software,
      sizeBytes: st.size,
      modifiedAt: st.mtime.toISOString()
    }
  } catch {
    return null
  }
}

function isRekordboxCollectionXml(filePath: string): boolean {
  try {
    if (!existsSync(filePath)) return false
    const st = statSync(filePath)
    if (!st.isFile() || st.size < 40) return false
    const head = readFileSync(filePath, { encoding: 'utf-8' }).slice(0, 600)
    return head.includes('<DJ_PLAYLISTS')
  } catch {
    return false
  }
}

function findInstalledApp(
  programFilesDirs: string[],
  vendorFolders: string[],
  folderPattern: RegExp,
  exeCandidates: string[]
): { versionLabel?: string; exePath?: string } {
  const matches: Array<{ name: string; fullDir: string }> = []
  for (const pf of programFilesDirs) {
    for (const vendor of vendorFolders) {
      const base = join(pf, vendor)
      if (!existsSync(base)) continue
      try {
        for (const entry of readdirSync(base, { withFileTypes: true })) {
          if (entry.isDirectory() && folderPattern.test(entry.name)) {
            matches.push({ name: entry.name, fullDir: join(base, entry.name) })
          }
        }
      } catch {
        // ignore permission errors
      }
    }
  }

  // Sort descending so highest version (e.g. rekordbox 7 > 6.8.5) wins
  matches.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))

  for (const m of matches) {
    for (const exe of exeCandidates) {
      const candidate = join(m.fullDir, exe)
      if (existsSync(candidate)) {
        return { versionLabel: m.name, exePath: candidate }
      }
    }
    return { versionLabel: m.name }
  }
  return {}
}

function detectRekordbox(roots: AutoDetectRoots): DetectedDjSoftware {
  const appInfo = findInstalledApp(
    roots.programFilesDirs,
    ['AlphaTheta', 'Pioneer'],
    /^rekordbox/i,
    ['rekordbox.exe', 'rekordboxAgent.exe']
  )

  const rbAppData = join(roots.appDataDir, 'Pioneer', 'rekordbox')
  const hasAppData = existsSync(rbAppData)

  const candidateXmlPaths = new Set<string>()

  // 1. Check Rekordbox's own rekordbox3.settings for configured XML export path
  const settingsPath = join(rbAppData, 'rekordbox3.settings')
  if (existsSync(settingsPath)) {
    try {
      const raw = readFileSync(settingsPath, 'utf-8')
      const m = raw.match(/name=["']importedLibraryLocation["'][^>]*val=["']([^"']+)["']/i)
      if (m && m[1]) {
        candidateXmlPaths.add(m[1])
      }
    } catch {
      // ignore
    }
  }

  // 2. Scan common folders for exported Rekordbox XML files
  const scanFolders = [
    rbAppData,
    ...getCandidateDocDirs(roots),
    ...getCandidateDocDirs(roots).map((d) => join(d, 'rekordbox')),
    ...getCandidateDocDirs(roots).map((d) => join(d, 'Pioneer')),
    ...getCandidateMusicDirs(roots),
    ...getCandidateMusicDirs(roots).map((d) => join(d, 'rekordbox')),
    roots.desktopDir,
    roots.downloadsDir
  ]

  for (const folder of scanFolders) {
    if (!existsSync(folder)) continue
    try {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        if (!entry.isFile()) continue
        if (/\.xml$/i.test(entry.name) && /rekord|dj|collection|export|playlist/i.test(entry.name)) {
          candidateXmlPaths.add(join(folder, entry.name))
        }
      }
    } catch {
      // ignore
    }
  }

  const libraryFiles: DetectedLibraryFile[] = []
  for (const xmlPath of candidateXmlPaths) {
    if (!isRekordboxCollectionXml(xmlPath)) continue
    const item = toLibraryFile(xmlPath, basename(xmlPath), 'rekordbox')
    if (item) libraryFiles.push(item)
  }

  libraryFiles.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))

  return {
    id: 'rekordbox',
    name: 'Rekordbox',
    installed: Boolean(appInfo.versionLabel || hasAppData || libraryFiles.length > 0),
    versionLabel: appInfo.versionLabel ?? (hasAppData ? 'Datos detectados' : undefined),
    appExePath: appInfo.exePath,
    dataDir: hasAppData ? rbAppData : undefined,
    libraryFiles: libraryFiles.slice(0, 6)
  }
}

function detectTraktor(roots: AutoDetectRoots): DetectedDjSoftware {
  const appInfo = findInstalledApp(
    roots.programFilesDirs,
    ['Native Instruments'],
    /^Traktor/i,
    ['Traktor.exe', 'Traktor Pro 4.exe', 'Traktor Pro 3.exe']
  )

  const libraryFiles: DetectedLibraryFile[] = []
  let newestDataDir: string | undefined

  for (const docDir of getCandidateDocDirs(roots)) {
    const niDir = join(docDir, 'Native Instruments')
    if (!existsSync(niDir)) continue
    try {
      const traktorDirs = readdirSync(niDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && /^Traktor/i.test(e.name))
        .map((e) => e.name)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

      for (const td of traktorDirs) {
        const fullDir = join(niDir, td)
        if (!newestDataDir) newestDataDir = fullDir
        const colPath = join(fullDir, 'collection.nml')
        const item = toLibraryFile(colPath, `${td} · collection.nml`, 'traktor')
        if (item) libraryFiles.push(item)
      }
    } catch {
      // ignore
    }
  }

  // Also check Desktop/Downloads for standalone .nml exports
  for (const folder of [roots.desktopDir, roots.downloadsDir]) {
    if (!existsSync(folder)) continue
    try {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        if (entry.isFile() && /\.nml$/i.test(entry.name)) {
          const item = toLibraryFile(join(folder, entry.name), entry.name, 'traktor')
          if (item) libraryFiles.push(item)
        }
      }
    } catch {
      // ignore
    }
  }

  libraryFiles.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))

  return {
    id: 'traktor',
    name: 'Traktor Pro',
    installed: Boolean(appInfo.versionLabel || newestDataDir || libraryFiles.length > 0),
    versionLabel: appInfo.versionLabel ?? (newestDataDir ? basename(newestDataDir) : undefined),
    appExePath: appInfo.exePath,
    dataDir: newestDataDir,
    libraryFiles: libraryFiles.slice(0, 6)
  }
}

function detectSerato(roots: AutoDetectRoots): DetectedDjSoftware {
  const appInfo = findInstalledApp(
    roots.programFilesDirs,
    ['Serato'],
    /^Serato/i,
    ['Serato DJ Pro.exe', 'Serato DJ Lite.exe', 'Serato DJ.exe']
  )

  const libraryFiles: DetectedLibraryFile[] = []
  let seratoDir: string | undefined

  for (const musicDir of getCandidateMusicDirs(roots)) {
    const candidate = join(musicDir, '_Serato_')
    if (!existsSync(candidate)) continue
    if (!seratoDir) seratoDir = candidate
    const subcrates = join(candidate, 'Subcrates')
    if (!existsSync(subcrates)) continue
    try {
      for (const entry of readdirSync(subcrates, { withFileTypes: true })) {
        if (!entry.isFile() || !/\.crate$/i.test(entry.name)) continue
        const label = entry.name.replace(/\.crate$/i, '').replace(/%%/g, ' / ')
        const item = toLibraryFile(join(subcrates, entry.name), label, 'serato')
        if (item) libraryFiles.push(item)
      }
    } catch {
      // ignore
    }
  }

  libraryFiles.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))

  return {
    id: 'serato',
    name: 'Serato DJ',
    installed: Boolean(appInfo.versionLabel || seratoDir || libraryFiles.length > 0),
    versionLabel: appInfo.versionLabel ?? (seratoDir ? `${libraryFiles.length} crates` : undefined),
    appExePath: appInfo.exePath,
    dataDir: seratoDir,
    libraryFiles: libraryFiles.slice(0, 20)
  }
}

function detectVirtualDj(roots: AutoDetectRoots): DetectedDjSoftware {
  const appInfo = findInstalledApp(
    roots.programFilesDirs,
    ['VirtualDJ', 'Atomix Productions'],
    /VirtualDJ/i,
    ['virtualdj.exe', 'virtualdj8.exe']
  )

  const libraryFiles: DetectedLibraryFile[] = []
  let vdjDir: string | undefined

  for (const docDir of getCandidateDocDirs(roots)) {
    const dir = join(docDir, 'VirtualDJ')
    if (!existsSync(dir)) continue
    if (!vdjDir) vdjDir = dir
    const dbPath = join(dir, 'database.xml')
    const item = toLibraryFile(dbPath, 'VirtualDJ · database.xml', 'virtualdj')
    if (item) libraryFiles.push(item)
  }

  return {
    id: 'virtualdj',
    name: 'VirtualDJ',
    installed: Boolean(appInfo.versionLabel || vdjDir || libraryFiles.length > 0),
    versionLabel: appInfo.versionLabel ?? (vdjDir ? 'Librería detectada' : undefined),
    appExePath: appInfo.exePath,
    dataDir: vdjDir,
    libraryFiles
  }
}

function detectSoulseek(roots: AutoDetectRoots): {
  software: DetectedDjSoftware
  suggestedDownloadDir?: string
} {
  const slskLocal = join(roots.localAppDataDir, 'SoulseekQt')
  const hasSlskData = existsSync(slskLocal)

  const appInfo = findInstalledApp(
    roots.programFilesDirs,
    ['SoulseekQt', ''],
    /^Soulseek/i,
    ['SoulseekQt.exe']
  )

  const candidateDownloadDirs = [
    ...getCandidateDocDirs(roots).map((d) => join(d, 'Soulseek Downloads', 'complete')),
    ...getCandidateDocDirs(roots).map((d) => join(d, 'Soulseek Downloads')),
    ...getCandidateMusicDirs(roots).map((d) => join(d, 'FZR Soulseek Downloads'))
  ]

  let suggestedDownloadDir: string | undefined
  for (const dir of candidateDownloadDirs) {
    if (existsSync(dir)) {
      suggestedDownloadDir = dir
      break
    }
  }

  return {
    software: {
      id: 'soulseek',
      name: 'Soulseek Autopilot',
      installed: true, // Native protocol is always built into FZR v2.1!
      versionLabel: hasSlskData || appInfo.versionLabel ? 'Nativo + SoulseekQt detectado' : 'Motor nativo integrado',
      appExePath: appInfo.exePath,
      dataDir: suggestedDownloadDir ?? (hasSlskData ? slskLocal : undefined),
      libraryFiles: []
    },
    suggestedDownloadDir
  }
}

/**
 * Scan standard Windows/macOS paths for Rekordbox, Traktor Pro, Serato DJ, VirtualDJ, and Soulseek.
 */
export function detectDjEnvironment(
  roots: AutoDetectRoots = getDefaultWindowsRoots()
): DetectedDjEnvironment {
  const slsk = detectSoulseek(roots)
  return {
    scannedAt: new Date().toISOString(),
    rekordbox: detectRekordbox(roots),
    traktor: detectTraktor(roots),
    serato: detectSerato(roots),
    virtualdj: detectVirtualDj(roots),
    soulseek: slsk.software,
    suggestedDownloadDir: slsk.suggestedDownloadDir
  }
}

/**
 * Load multiple Serato .crate files in one click into a unified multi-playlist ParseResult.
 */
export function parseSeratoCratesBatch(cratePaths: string[]): ParseResult {
  const allTracks: Track[] = []
  const playlists: Playlist[] = []
  const warnings: string[] = []

  for (const filePath of cratePaths) {
    try {
      const buf = readFileSync(filePath)
      const res = parseSeratoCrate(buf, filePath)
      allTracks.push(...res.tracks)
      playlists.push(...res.playlists)
      warnings.push(...res.warnings)
    } catch (err) {
      warnings.push(`No se pudo leer ${basename(filePath)}: ${(err as Error).message}`)
    }
  }

  return { tracks: allTracks, playlists, warnings }
}

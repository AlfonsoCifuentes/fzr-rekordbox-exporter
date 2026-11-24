import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectDjEnvironment, type AutoDetectRoots } from '../../main/djAutoDetect'

const createdDirs: string[] = []

function makeTempRoots(): AutoDetectRoots {
  const base = mkdtempSync(join(tmpdir(), 'fzr-detect-'))
  createdDirs.push(base)
  const roots: AutoDetectRoots = {
    homeDir: base,
    appDataDir: join(base, 'AppData', 'Roaming'),
    localAppDataDir: join(base, 'AppData', 'Local'),
    documentsDir: join(base, 'Documents'),
    musicDir: join(base, 'Music'),
    desktopDir: join(base, 'Desktop'),
    downloadsDir: join(base, 'Downloads'),
    programFilesDirs: [join(base, 'Program Files')]
  }
  mkdirSync(roots.appDataDir, { recursive: true })
  mkdirSync(roots.localAppDataDir, { recursive: true })
  mkdirSync(roots.documentsDir, { recursive: true })
  mkdirSync(roots.musicDir, { recursive: true })
  mkdirSync(roots.desktopDir, { recursive: true })
  mkdirSync(roots.downloadsDir, { recursive: true })
  mkdirSync(roots.programFilesDirs[0], { recursive: true })
  return roots
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
})

describe('detectDjEnvironment', () => {
  it('detects installed Rekordbox, valid DJ_PLAYLISTS XML, Traktor NML, Serato crates, VirtualDJ DB, and Soulseek downloads', () => {
    const roots = makeTempRoots()

    // Rekordbox installation + XML + invalid XML (should be ignored)
    const rbAppDir = join(roots.programFilesDirs[0], 'Pioneer', 'rekordbox 6.8.5')
    mkdirSync(rbAppDir, { recursive: true })
    writeFileSync(join(rbAppDir, 'rekordbox.exe'), 'exe')

    const rbXml = join(roots.documentsDir, 'rekordbox_export.xml')
    writeFileSync(
      rbXml,
      '<?xml version="1.0" encoding="UTF-8"?><DJ_PLAYLISTS Version="1.0.0"><COLLECTION Entries="0"/></DJ_PLAYLISTS>'
    )
    // Non-Rekordbox XML must be ignored
    writeFileSync(
      join(roots.documentsDir, 'random_playlist.xml'),
      '<?xml version="1.0"?><NOT_REKORDBOX/>'
    )

    // Traktor Pro 4 collection.nml
    const trDir = join(roots.documentsDir, 'Native Instruments', 'Traktor 4.1.0')
    mkdirSync(trDir, { recursive: true })
    writeFileSync(join(trDir, 'collection.nml'), '<NML VERSION="19"></NML>')

    // Serato Subcrates
    const seratoSub = join(roots.musicDir, '_Serato_', 'Subcrates')
    mkdirSync(seratoSub, { recursive: true })
    writeFileSync(join(seratoSub, 'Techno%%Peak.crate'), Buffer.from('vrsn'))

    // VirtualDJ database.xml
    const vdjDir = join(roots.documentsDir, 'VirtualDJ')
    mkdirSync(vdjDir, { recursive: true })
    writeFileSync(join(vdjDir, 'database.xml'), '<VirtualDJ_Database/>')

    // Soulseek Downloads folder
    const slskComplete = join(roots.documentsDir, 'Soulseek Downloads', 'complete')
    mkdirSync(slskComplete, { recursive: true })

    const env = detectDjEnvironment(roots)

    expect(env.rekordbox.installed).toBe(true)
    expect(env.rekordbox.versionLabel).toBe('rekordbox 6.8.5')
    expect(env.rekordbox.libraryFiles).toHaveLength(1)
    expect(env.rekordbox.libraryFiles[0].path).toBe(rbXml)

    expect(env.traktor.installed).toBe(true)
    expect(env.traktor.libraryFiles).toHaveLength(1)
    expect(env.traktor.libraryFiles[0].label).toContain('Traktor 4.1.0')

    expect(env.serato.installed).toBe(true)
    expect(env.serato.libraryFiles).toHaveLength(1)
    expect(env.serato.libraryFiles[0].label).toBe('Techno / Peak')

    expect(env.virtualdj.installed).toBe(true)
    expect(env.virtualdj.libraryFiles).toHaveLength(1)

    expect(env.suggestedDownloadDir).toBe(slskComplete)
  })
})

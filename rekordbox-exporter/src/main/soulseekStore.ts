import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  DEFAULT_AUTOPILOT_CONFIG,
  type AutopilotConfig,
  type AutopilotSessionState
} from '../core/soulseek/types'

type StoredSoulseekConfig = Omit<AutopilotConfig, 'password'> & {
  encryptedPassword?: string
  plainPassword?: string
}

function getConfigPath(): string {
  return join(app.getPath('userData'), 'soulseek-autopilot-config.json')
}

function getBackupDir(): string {
  return join(app.getPath('userData'), 'soulseek-config-backups')
}

function getStatePath(): string {
  return join(app.getPath('userData'), 'soulseek-autopilot-state.json')
}

function getDefaultDownloadDir(): string {
  try {
    const slskComplete = join(app.getPath('documents'), 'Soulseek Downloads', 'complete')
    if (existsSync(slskComplete)) return slskComplete
    const slskDocs = join(app.getPath('documents'), 'Soulseek Downloads')
    if (existsSync(slskDocs)) return slskDocs
    return join(app.getPath('music'), 'FZR Soulseek Downloads')
  } catch {
    return join(app.getPath('documents'), 'FZR Soulseek Downloads')
  }
}

/**
 * Rotate up to 5 non-secret backups of the Autopilot configuration (FZR Autopilot v3 feature).
 */
function backupNonSecretConfig(stored: StoredSoulseekConfig): void {
  try {
    const dir = getBackupDir()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const safeCopy = { ...stored }
    delete safeCopy.encryptedPassword
    delete safeCopy.plainPassword
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    writeFileSync(join(dir, `config-backup-${stamp}.json`), JSON.stringify(safeCopy, null, 2), 'utf-8')

    const backups = readdirSync(dir)
      .filter((f) => f.startsWith('config-backup-') && f.endsWith('.json'))
      .sort()
    while (backups.length > 5) {
      const oldest = backups.shift()
      if (oldest) {
        try {
          unlinkSync(join(dir, oldest))
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // non-critical
  }
}

export function loadAutopilotConfig(): AutopilotConfig {
  const defaults: AutopilotConfig = {
    ...DEFAULT_AUTOPILOT_CONFIG,
    downloadDir: getDefaultDownloadDir()
  }
  try {
    if (!existsSync(getConfigPath())) return defaults
    const raw = readFileSync(getConfigPath(), 'utf-8')
    const stored = JSON.parse(raw) as Partial<StoredSoulseekConfig>

    let password = ''
    if (stored.encryptedPassword && safeStorage.isEncryptionAvailable()) {
      try {
        password = safeStorage.decryptString(Buffer.from(stored.encryptedPassword, 'base64'))
      } catch {
        password = ''
      }
    } else if (stored.plainPassword) {
      password = stored.plainPassword
    }

    return {
      ...defaults,
      ...stored,
      downloadDir: stored.downloadDir || defaults.downloadDir,
      password
    }
  } catch {
    return defaults
  }
}

export function saveAutopilotConfig(config: AutopilotConfig): void {
  const { password, ...rest } = config
  const stored: StoredSoulseekConfig = { ...rest }
  if (password) {
    if (safeStorage.isEncryptionAvailable()) {
      stored.encryptedPassword = safeStorage.encryptString(password).toString('base64')
    } else {
      stored.plainPassword = password
    }
  }
  writeFileSync(getConfigPath(), JSON.stringify(stored, null, 2), 'utf-8')
  backupNonSecretConfig(stored)
}

export function loadAutopilotState(): AutopilotSessionState | null {
  try {
    if (!existsSync(getStatePath())) return null
    const raw = readFileSync(getStatePath(), 'utf-8')
    return JSON.parse(raw) as AutopilotSessionState
  } catch {
    return null
  }
}

export function saveAutopilotState(state: AutopilotSessionState): void {
  try {
    writeFileSync(getStatePath(), JSON.stringify(state, null, 2), 'utf-8')
  } catch {
    // non-critical
  }
}

export function clearAutopilotState(): void {
  try {
    if (existsSync(getStatePath())) unlinkSync(getStatePath())
  } catch {
    // ignore
  }
}

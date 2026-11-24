import { shell } from 'electron'
import * as http from 'http'
import * as crypto from 'crypto'
import { URL, URLSearchParams } from 'url'

export const SPOTIFY_REDIRECT_PORT = 7823
export const SPOTIFY_REDIRECT_URI = `http://127.0.0.1:${SPOTIFY_REDIRECT_PORT}/callback`
const LOGIN_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes

export type SpotifyTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt: number // epoch ms
}

let activeServer: http.Server | null = null
let activeTimeout: NodeJS.Timeout | null = null

export function cancelActiveSpotifyLogin(): void {
  if (activeTimeout) {
    clearTimeout(activeTimeout)
    activeTimeout = null
  }
  if (activeServer) {
    try {
      activeServer.close()
    } catch {
      // ignore
    }
    activeServer = null
  }
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

function callbackHtml(title: string, subtitle: string, ok: boolean): string {
  const accent = ok ? '#1db954' : '#e74c3c'
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>FZR Rekordbox Exporter — Spotify</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0b0e;
      color: #f0f2f8;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #161921;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 36px 40px;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .badge {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${accent}20;
      border: 2px solid ${accent};
      color: ${accent};
      font-size: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    h2 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0; color: #8c93a8; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${ok ? '✓' : '✕'}</div>
    <h2>${title}</h2>
    <p>${subtitle}</p>
  </div>
</body>
</html>`
}

export async function performSpotifyLogin(clientId: string): Promise<SpotifyTokens> {
  // Clean up any previous abandoned login server to avoid EADDRINUSE
  cancelActiveSpotifyLogin()

  const verifier = generateCodeVerifier()
  const challenge = generateCodeChallenge(verifier)
  const expectedState = generateState()

  return new Promise((resolve, reject) => {
    let settled = false

    const cleanup = (): void => {
      if (activeTimeout) {
        clearTimeout(activeTimeout)
        activeTimeout = null
      }
      if (activeServer) {
        try {
          activeServer.close()
        } catch {
          // ignore
        }
        activeServer = null
      }
    }

    const finishResolve = (tokens: SpotifyTokens): void => {
      if (settled) return
      settled = true
      cleanup()
      resolve(tokens)
    }

    const finishReject = (err: Error): void => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }

    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400)
          res.end()
          return
        }

        const parsed = new URL(req.url, `http://127.0.0.1:${SPOTIFY_REDIRECT_PORT}`)
        if (parsed.pathname !== '/callback') {
          res.writeHead(404)
          res.end()
          return
        }

        const code = parsed.searchParams.get('code')
        const error = parsed.searchParams.get('error')
        const returnedState = parsed.searchParams.get('state')

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })

        if (error) {
          res.end(
            callbackHtml(
              'Autorización cancelada',
              'Puedes cerrar esta pestaña y volver a FZR Rekordbox Exporter.',
              false
            )
          )
          finishReject(new Error(`Autorización de Spotify cancelada (${error})`))
          return
        }

        if (returnedState !== expectedState) {
          res.end(
            callbackHtml(
              'Error de seguridad (state inválido)',
              'Por favor intenta iniciar sesión de nuevo desde la aplicación.',
              false
            )
          )
          finishReject(new Error('Estado OAuth inválido — posible fallo de sesión. Reintenta el login.'))
          return
        }

        if (!code) {
          res.end(
            callbackHtml(
              'No se recibió código de autorización',
              'Verifica que el Redirect URI en Spotify Developer sea exactamente http://127.0.0.1:7823/callback.',
              false
            )
          )
          finishReject(new Error('Spotify no devolvió ningún código de autorización'))
          return
        }

        res.end(
          callbackHtml(
            '¡Conectado a Spotify!',
            'Ya puedes cerrar esta pestaña y volver a FZR Rekordbox Exporter.',
            true
          )
        )

        const tokens = await exchangeCode(code, verifier, clientId)
        finishResolve(tokens)
      } catch (err) {
        finishReject(err instanceof Error ? err : new Error(String(err)))
      }
    })

    activeServer = server

    server.on('error', (err) => {
      finishReject(
        new Error(
          `No se pudo iniciar el servidor de callback en el puerto ${SPOTIFY_REDIRECT_PORT}: ${(err as Error).message}`
        )
      )
    })

    activeTimeout = setTimeout(() => {
      finishReject(
        new Error('Tiempo de espera agotado (3 min). Intenta iniciar sesión de nuevo.')
      )
    }, LOGIN_TIMEOUT_MS)

    server.listen(SPOTIFY_REDIRECT_PORT, '127.0.0.1', () => {
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state: expectedState,
        scope: 'playlist-modify-public playlist-modify-private user-read-private'
      })
      shell.openExternal(`https://accounts.spotify.com/authorize?${params.toString()}`)
    })
  })
}

async function exchangeCode(
  code: string,
  verifier: string,
  clientId: string
): Promise<SpotifyTokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier
    }).toString()
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Error al obtener token de Spotify (${res.status}): ${text}`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }
  if (!data.access_token) {
    throw new Error('Spotify no devolvió access_token')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000
  }
}

export async function refreshSpotifyToken(
  refreshToken: string,
  clientId: string
): Promise<SpotifyTokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    }).toString()
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Error al renovar token de Spotify (${res.status}): ${text}`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  if (!data.access_token) {
    throw new Error('Spotify no devolvió access_token al renovar sesión')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000
  }
}

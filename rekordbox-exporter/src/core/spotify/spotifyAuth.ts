import { shell } from 'electron'
import * as http from 'http'
import * as crypto from 'crypto'
import { URL, URLSearchParams } from 'url'

const REDIRECT_PORT = 7823
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export async function performSpotifyLogin(clientId: string): Promise<string> {
  const verifier = generateCodeVerifier()
  const challenge = generateCodeChallenge(verifier)

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400)
          res.end()
          return
        }

        const parsed = new URL(req.url, `http://localhost:${REDIRECT_PORT}`)
        const code = parsed.searchParams.get('code')
        const error = parsed.searchParams.get('error')

        const html = (msg: string): string =>
          `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;background:#0f0f0f;color:#fff}h2{font-size:1.4rem}p{color:#aaa}</style></head><body><h2>${msg}</h2><p>Puedes cerrar esta ventana y volver a la aplicación.</p></body></html>`

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })

        if (error) {
          res.end(html('Autorización cancelada'))
          server.close()
          reject(new Error(`Spotify auth cancelled: ${error}`))
          return
        }

        if (!code) {
          res.end(html('Error: no se recibió código'))
          server.close()
          reject(new Error('No authorization code received from Spotify'))
          return
        }

        res.end(html('✓ ¡Autorización completada!'))
        server.close()

        const token = await exchangeCode(code, verifier, clientId)
        resolve(token)
      } catch (err) {
        server.close()
        reject(err)
      }
    })

    server.on('error', (err) => {
      reject(new Error(`No se pudo iniciar servidor de callback: ${(err as Error).message}`))
    })

    server.listen(REDIRECT_PORT, '127.0.0.1', () => {
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        scope: 'playlist-modify-public playlist-modify-private'
      })
      shell.openExternal(
        `https://accounts.spotify.com/authorize?${params.toString()}`
      )
    })
  })
}

async function exchangeCode(
  code: string,
  verifier: string,
  clientId: string
): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier
    }).toString()
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Error al obtener token de Spotify (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { access_token: string }
  if (!data.access_token) {
    throw new Error('Spotify no devolvió access_token')
  }
  return data.access_token
}

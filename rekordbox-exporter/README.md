# Rekordbox Exporter

Aplicación de escritorio para exportar playlists de Rekordbox a Spotify y Traktor.

## Stack

- **Frontend**: React + TypeScript + Vite
- **Desktop**: Electron + electron-vite
- **Parser XML**: fast-xml-parser
- **Tests**: Vitest

## Instalación

```bash
cd rekordbox-exporter
npm install
npm run dev
```

## Cómo exportar XML desde Rekordbox

1. Abre Rekordbox
2. Ve a **File → Export Collection in rekordbox xml format**
3. Guarda el archivo `.xml` en tu equipo
4. Ábrelo en esta aplicación

## Cómo importar en Traktor

### M3U8

En Traktor: **File → Import → Import Playlist...** → selecciona el `.m3u8`

### NML

En Traktor: **File → Import → Import Playlist...** → selecciona el `.nml`

> ⚠️ La exportación NML es experimental. Si algo falla, usa el M3U8 como fallback.

## Configuración Spotify (Fase 3)

1. Crea una app en [developer.spotify.com](https://developer.spotify.com)
2. Copia `.env.example` a `.env`
3. Rellena `SPOTIFY_CLIENT_ID` con tu Client ID
4. Añade `http://localhost:8888/callback` como Redirect URI en tu app de Spotify

## Fases de desarrollo

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1 | ✅ Implementado | Parser Rekordbox XML + UI + M3U8 + NML + informes |
| 2 | ⏳ Pendiente | Integración Spotify OAuth + búsqueda |
| 3 | ⏳ Pendiente | Creación de playlists en Spotify |
| 4 | ⏳ Pendiente | Pulido, historial, empaquetado Windows |

## Limitaciones conocidas

- **Spotify**: Muchos tracks DJ (bootlegs, edits, promos, Bandcamp) no están en el catálogo de Spotify. Esto es normal y la app lo indica claramente.
- **NML**: El formato NML puede variar entre versiones de Traktor. Siempre se genera también el M3U8 como fallback.
- **Archivos locales**: La app nunca sube tu música a ningún servidor.
- **collection.nml**: La app nunca modifica tu `collection.nml` directamente.

## Tests

```bash
npm test
```

## Build Windows

```bash
npm run build
npm run package
```

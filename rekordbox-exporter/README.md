# FZR Rekordbox Exporter

Aplicación de escritorio 100% local y hub bidireccional para DJs: convierte entre **Rekordbox** (`.xml`, `.m3u8`, `.txt`), **Traktor Pro** (`.nml` v19 y `.m3u8`) y **Spotify** (OAuth PKCE + matching inteligente con revisión manual), con análisis armónico Camelot, detección de duplicados y reparador de rutas.

## Características principales

- **Importación multiplataforma (Rekordbox + Traktor)**:
  - `.xml` (Rekordbox): lee colección, carpetas anidadas, orden exacto, BPM, tonalidad, metadata, `file://localhost/` URIs, `KeyType="0"`/`"1"`, y puntos **Cue / Hot Cues / Loops (`POSITION_MARK`)**.
  - `.nml` (Traktor Pro): importa colecciones, carpetas, playlists, Open Key → Camelot, BPM y **`CUE_V2`** (Hot Cues y Loops).
  - `.m3u8` / `.m3u`: soporte UTF-8 BOM, `#EXTINF`, `#EXTALB`, `#EXTGENRE` y `file://` URIs.
  - `.txt`: detección automática de codificación **UTF-16 LE / UTF-16 BE / UTF-8** y cabeceras de Rekordbox en inglés y español.
- **Análisis DJ y optimización de playlists**:
  - **Flujo armónico Camelot**: calcula la compatibilidad entre pistas consecutivas (`✓ Armónico`, `⚡ Energy Boost`, `⚠ Choque`) y permite **auto-ordenar armónicamente (Camelot + BPM)** en un clic.
  - **Detector y limpiador de duplicados**: encuentra duplicados exactos y versiones repetidas del mismo tema.
  - **Reparador de rutas (Path Remapper)**: reemplaza prefijos de disco/carpeta (`/Volumes/USB` → `D:/Music`) en todas las playlists con verificación en disco.
- **Exportación bidireccional y utilidades DJ**:
  - **Traktor NML v19** con `DIR="/:Music/:Artist/:"`, `VOLUME`, `PRIMARYKEY`, `<ALBUM>`, `<INFO>`, `<TEMPO>`, `<MUSICAL_KEY VALUE="0..23"/>` y `<CUE_V2>`.
  - **Rekordbox XML** (`DJ_PLAYLISTS`) con `POSITION_MARK` y `file://localhost/` URIs (ideal para migrar desde Traktor o tras optimizar playlists).
  - **M3U8** (rutas absolutas o relativas), **copia portable de archivos de audio**, **Tracklist DJ con timestamps** (`.txt` y `.md` para YouTube/SoundCloud/Mixcloud) y **CSV universal para streaming** (Apple Music, Tidal, Deezer, Soundiiz, TuneMyMusic).
  - Nunca modifica tu `collection.nml` original.
- **Integración Spotify (OAuth 2.0 PKCE)**:
  - Sin Client Secret ni backend remoto; tokens cifrados localmente con `safeStorage` y renovación automática.
  - Motor de matching multi-consulta con puntuación ponderada (título, artista, duración, mix/remix, álbum) y reintentos automáticos ante rate limits `429`.
  - **Pantalla de revisión manual** previa a crear la playlist: elige candidatos alternativos, busca manualmente en vivo o omite bootlegs/promos.
  - Caché local de coincidencias y opción de playlist pública o privada.
  - Alternativa rápida `.txt` compatible con Soundiiz / TuneMyMusic.
- **Informes detallados**: genera automáticamente `_report.json` y `_report.csv` por cada playlist.

## Instalación y desarrollo

```bash
cd rekordbox-exporter
npm install
npm run dev
```

## Cómo exportar desde Rekordbox

1. **XML completo (recomendado)**: *File → Export Collection in rekordbox xml format*
2. **M3U8 / TXT**: clic derecho sobre la playlist → *Export Playlist* → elige `.m3u8` o `.txt`
3. Arrastra el archivo a la ventana de FZR Rekordbox Exporter o selecciónalo manualmente.

## Cómo importar en Traktor Pro

En Traktor Pro: **File → Import → Import Playlist...** y selecciona el archivo `.nml` o `.m3u8` generado.

## Configuración de Spotify (opcional)

1. Crea una app gratuita en [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. En **Redirect URIs**, añade exactamente:
   ```
   http://127.0.0.1:7823/callback
   ```
3. Copia el **Client ID** y pégalo dentro de la app en la pantalla de exportación.

## Tests y build

```bash
npm test
npm run typecheck
npm run build
npm run dist
```

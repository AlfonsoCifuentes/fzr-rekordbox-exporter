# FZR Rekordbox Exporter

Aplicación de escritorio 100% local y hub bidireccional para DJs: convierte entre **Rekordbox** (`.xml`, `.m3u8`, `.txt`), **Traktor Pro** (`.nml` v19 y `.m3u8`) y **Spotify** (OAuth PKCE + matching inteligente con revisión manual), con análisis armónico Camelot, detección de duplicados y reparador de rutas.

## Características principales

- **Importación multiplataforma (Rekordbox + Traktor + Serato + VirtualDJ + Streaming CSV)**:
  - `.xml` (Rekordbox & VirtualDJ): lee colecciones, carpetas anidadas, orden exacto, BPM, tonalidad, metadata, `file://localhost/` URIs, `KeyType="0"`/`"1"`, y puntos **Cue / Hot Cues / Loops (`POSITION_MARK` / `Poi`)**.
  - `.nml` (Traktor Pro): importa colecciones, carpetas, playlists, Open Key → Camelot, BPM y **`CUE_V2`** (Hot Cues y Loops).
  - `.crate` (Serato DJ): parser binario TLV Big-Endian nativo con soporte de subcrates (`%%`).
  - `.vdjfolder`, `.m3u8` / `.m3u`, `.txt` (UTF-16 LE / UTF-8) y `.csv` (Exportify / Soundiiz / Apple Music / Tidal).
- **Análisis DJ y optimización de playlists**:
  - **Rueda Armónica Camelot SVG + Curva BPM**: visualiza la distribución de tonalidades y compatibilidad entre pistas consecutivas (`✓ Armónico`, `⚡ Energy Boost`, `⚠ Choque`) con **auto-orden armónico (Camelot + BPM)** en un clic.
  - **Limpiador de metadatos y corrector BPM ×2/÷2**: elimina etiquetas de ruido (`[FREE DOWNLOAD]`, `(320kbps)`, `www.*`), extrae `Artista - Título`, normaliza keys a Camelot y corrige pistas analizadas a mitad o doble BPM.
  - **Fusionar, Comparar (Diff), Dividir por Zonas BPM/Género y Duplicados**.
  - **Reparador de rutas y Auto-relocalizador**: reemplaza prefijos rotos o escanea una carpeta de tu disco para reparar archivos faltantes automáticamente.
- **Exportación bidireccional y utilidades DJ**:
  - **Traktor NML v19** con `DIR="/:Music/:Artist/:"`, `VOLUME`, `PRIMARYKEY`, `<ALBUM>`, `<INFO>`, `<TEMPO>`, `<MUSICAL_KEY VALUE="0..23"/>` y `<CUE_V2>`.
  - **Rekordbox XML** (`DJ_PLAYLISTS`) con `POSITION_MARK` y `file://localhost/` URIs.
  - **M3U8** (rutas absolutas o relativas), **copia portable de audio USB**, **CUE Sheet (`.cue`)**, **Booth Prep Sheet imprimible (`.html`)**, **Tracklist DJ (`.txt`/`.md`)** y **CSV universal para streaming**.
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

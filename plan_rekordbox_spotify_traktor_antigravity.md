# Plan de desarrollo — Rekordbox Playlist Exporter to Spotify + Traktor

## 1. Objetivo de la aplicación

Crear una aplicación de escritorio local que permita importar playlists exportadas desde Rekordbox en formato XML y convertirlas en:

1. Playlists reales de Spotify, creadas mediante la Spotify Web API.
2. Playlists importables en Traktor, preferiblemente en formato `.nml`.
3. Playlists `.m3u8` como formato de compatibilidad/fallback para Traktor y otros programas DJ.

La aplicación debe estar pensada para DJs que tienen su librería organizada en Rekordbox y quieren sincronizar o migrar playlists a Spotify y Traktor sin hacerlo manualmente tema por tema.

---

## 2. Stack recomendado

Usar una app de escritorio multiplataforma:

- Frontend: React + TypeScript + Vite.
- App desktop: Tauri preferiblemente, o Electron si Tauri da problemas.
- Backend/local services: Node.js/TypeScript.
- Parsing XML: `fast-xml-parser` o `xml2js`.
- Lectura opcional de metadatos de audio: `music-metadata`.
- Fuzzy matching: `fuse.js` o función propia con puntuación ponderada.
- Persistencia local: SQLite.
- OAuth Spotify: Authorization Code Flow con PKCE.
- Testing: Vitest para lógica, Playwright para flujos UI principales.

Prioridad: aplicación local, sin backend remoto y sin subir archivos del usuario a ningún servidor.

---

## 3. Flujo principal del usuario

### Flujo MVP

1. El usuario abre la app.
2. Selecciona un archivo XML exportado desde Rekordbox.
3. La app parsea:
   - Colección de tracks.
   - Playlists.
   - Carpetas de playlists.
   - Orden de tracks dentro de cada playlist.
4. La app muestra una vista con:
   - Lista de playlists encontradas.
   - Número de tracks por playlist.
   - Estado de coincidencia Spotify.
   - Estado de exportación Traktor.
5. El usuario selecciona una o varias playlists.
6. La app busca equivalencias en Spotify.
7. La app muestra una pantalla de revisión:
   - Coincidencias seguras.
   - Coincidencias dudosas.
   - Temas no encontrados.
   - Posibilidad de corregir manualmente.
8. El usuario pulsa:
   - “Crear playlist en Spotify”.
   - “Exportar para Traktor”.
   - “Exportar ambas”.
9. La app genera:
   - Playlist en Spotify.
   - Archivo `.nml`.
   - Archivo `.m3u8`.
   - Informe `.csv` o `.json` con resultados.

---

## 4. Limitaciones importantes

No prometer una conversión perfecta a Spotify.

Spotify no puede añadir archivos locales del usuario a una playlist pública mediante búsqueda si esos temas no existen en el catálogo de Spotify. Muchos temas DJ pueden fallar:

- Bootlegs.
- Edits privados.
- Promos.
- Tracks comprados en Bandcamp.
- Temas con nombres distintos.
- Extended mixes no disponibles en Spotify.
- Versiones con metadata mal escrita.
- Remixes underground no publicados en streaming.

La app debe tratar esto como parte normal del flujo, no como error.

Debe existir siempre una pantalla de revisión manual antes de crear la playlist final.

---

## 5. Estructura de datos interna

Crear un modelo interno neutral para no acoplar todo a Rekordbox, Spotify o Traktor.

```ts
type Track = {
  internalId: string;
  rekordboxTrackId?: string;
  name: string;
  artist: string;
  album?: string;
  remixer?: string;
  mix?: string;
  genre?: string;
  year?: number;
  bpm?: number;
  key?: string;
  durationSeconds?: number;
  location?: string;
  comments?: string;
  rating?: number;
  dateAdded?: string;
  fileSize?: number;
  bitrate?: number;
  sampleRate?: number;
};

type Playlist = {
  id: string;
  name: string;
  path: string[];
  tracks: Track[];
};

type SpotifyMatch = {
  sourceTrackId: string;
  spotifyTrackId?: string;
  spotifyUri?: string;
  title?: string;
  artists?: string[];
  album?: string;
  durationMs?: number;
  confidence: number;
  status: "matched" | "ambiguous" | "not_found" | "manual";
  candidates: SpotifyCandidate[];
};

type ExportResult = {
  playlistName: string;
  totalTracks: number;
  matchedTracks: number;
  ambiguousTracks: number;
  notFoundTracks: number;
  spotifyPlaylistUrl?: string;
  nmlPath?: string;
  m3uPath?: string;
};
```

---

## 6. Parser de Rekordbox XML

Implementar un módulo:

```txt
src/core/rekordbox/parseRekordboxXml.ts
```

Responsabilidades:

1. Leer XML.
2. Validar que contiene `DJ_PLAYLISTS`.
3. Parsear `COLLECTION/TRACK`.
4. Crear índice por `TrackID`.
5. Parsear `PLAYLISTS/NODE`.
6. Resolver playlists de tipo carpeta y playlist.
7. Mantener el orden original de los tracks.
8. Convertir `Location` URI a path local cuando sea posible.
9. Normalizar campos vacíos.
10. Devolver un objeto neutral:

```ts
{
  tracks: Track[];
  playlists: Playlist[];
  warnings: string[];
}
```

Validaciones mínimas:

- XML inválido.
- Sin colección.
- Sin playlists.
- Playlist con referencias a tracks inexistentes.
- Tracks sin `Location`.
- Tracks sin artista o título.
- Rutas locales inexistentes.

---

## 7. Matching contra Spotify

Crear módulo:

```txt
src/core/spotify/matchTracks.ts
```

### Estrategia de matching

Para cada track de Rekordbox:

1. Normalizar título:
   - Quitar extensiones: `.mp3`, `.wav`, `.flac`, `.aiff`.
   - Quitar basura común: `[FREE DOWNLOAD]`, `(320kbps)`, `(Master)`, `(Clean)`.
   - Mantener información útil: `Original Mix`, `Extended Mix`, `Remix`.
2. Normalizar artista:
   - Separar `feat.`, `ft.`, `vs`, `&`.
   - Evitar eliminar colaboradores si mejoran la búsqueda.
3. Construir varias queries:
   - `track:"TITLE" artist:"ARTIST"`
   - `TITLE ARTIST`
   - `TITLE REMIXER`
   - `TITLE ALBUM ARTIST`
4. Buscar en Spotify con `type=track`.
5. Puntuar candidatos.

### Scoring sugerido

Puntuación de 0 a 100:

- Título exacto o casi exacto: hasta 40 puntos.
- Artista principal coincidente: hasta 25 puntos.
- Duración similar: hasta 20 puntos.
- Álbum o año coincidente: hasta 5 puntos.
- Mix/remix coincidente: hasta 10 puntos.

Reglas:

- `confidence >= 85`: match automático.
- `65 <= confidence < 85`: ambiguo, requiere revisión.
- `< 65`: no encontrado.

Tolerancia duración:

- Diferencia <= 3 segundos: excelente.
- Diferencia <= 8 segundos: aceptable.
- Diferencia > 20 segundos: penalizar fuerte.

Guardar en SQLite una tabla de caché:

```sql
CREATE TABLE spotify_matches (
  source_fingerprint TEXT PRIMARY KEY,
  source_title TEXT,
  source_artist TEXT,
  source_duration INTEGER,
  spotify_track_id TEXT,
  spotify_uri TEXT,
  confidence INTEGER,
  status TEXT,
  updated_at TEXT
);
```

El fingerprint puede generarse con:

```txt
lowercase(title + artist + duration + location)
```

---

## 8. Integración con Spotify

Crear módulo:

```txt
src/core/spotify/spotifyClient.ts
```

Funcionalidades:

1. Login con Spotify usando OAuth PKCE.
2. Guardar token y refresh token cifrado/localmente si es posible.
3. Buscar tracks.
4. Crear playlist con `POST /me/playlists`.
5. Añadir tracks por lotes.
6. Gestionar rate limits `429` con retry y backoff.
7. Crear descripción automática de playlist:

```txt
Imported from Rekordbox using Rekordbox Playlist Exporter.
Matched X/Y tracks.
Unmatched tracks exported in report.
```

### Reglas de seguridad

- No hardcodear client secret.
- Usar PKCE.
- Variables de entorno:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_REDIRECT_URI`
- Crear `.env.example`.
- No subir `.env` a git.
- Añadir `.gitignore`.

---

## 9. Exportador Traktor

Crear módulo:

```txt
src/core/traktor/exportTraktor.ts
```

Debe generar dos formatos:

### 9.1. M3U8

Archivo simple y robusto:

```m3u
#EXTM3U
#EXTINF:420,Artist - Track Name
C:\Music\Artist\Track Name.mp3
```

Requisitos:

- Usar UTF-8.
- Mantener orden de la playlist.
- Comprobar que las rutas existen.
- Avisar si faltan archivos.
- Permitir rutas absolutas.
- Permitir rutas relativas si el usuario elige una carpeta base.

### 9.2. NML

Generar archivo `.nml` importable por Traktor.

Importante: no modificar directamente `collection.nml` del usuario en el MVP. Generar archivos `.nml` independientes por playlist para que el usuario los importe manualmente desde Traktor.

El exportador NML debe:

1. Crear una estructura XML compatible con Traktor.
2. Incluir una colección con entries.
3. Incluir playlist con orden de tracks.
4. Convertir rutas Windows/Mac a estructura esperada por Traktor.
5. Incluir metadata básica:
   - Title.
   - Artist.
   - Album.
   - Genre.
   - BPM.
   - Key.
   - Duration.
   - Location.
6. Escapar correctamente entidades XML.
7. Validar el archivo generado abriéndolo como XML.
8. Añadir opción de exportar también los archivos de audio a una carpeta destino.

### Estrategia prudente

Como el formato NML puede variar entre versiones de Traktor, implementar primero un generador NML mínimo usando como referencia archivos NML exportados por Traktor. Añadir una carpeta:

```txt
fixtures/traktor/
  sample_exported_playlist.nml
```

Crear tests de snapshot para asegurar que la estructura se mantiene.

No editar nunca el `collection.nml` real del usuario sin:

- Crear backup.
- Confirmación explícita.
- Validación previa.
- Modo experimental activado.

---

## 10. Interfaz de usuario

Pantallas principales:

### 10.1. Home

- Botón “Importar XML de Rekordbox”.
- Botón “Conectar Spotify”.
- Estado de conexión Spotify.
- Últimos proyectos abiertos.

### 10.2. Importación

Mostrar:

- Nombre del archivo XML.
- Número total de tracks.
- Número de playlists.
- Warnings de parseo.

### 10.3. Selección de playlists

Tabla:

| Checkbox | Playlist | Carpeta | Tracks | Spotify status | Traktor status |
|---|---|---|---|---|---|

Acciones:

- Seleccionar todas.
- Filtrar por nombre.
- Continuar.

### 10.4. Matching Spotify

Mostrar progreso:

```txt
Buscando 34/120...
Matched: 81
Ambiguous: 22
Not found: 17
```

Debe permitir pausar/cancelar.

### 10.5. Revisión manual

Tabla:

| Rekordbox Track | Spotify Match | Confidence | Acción |
|---|---|---|---|

Acciones por track:

- Aceptar match.
- Buscar manualmente.
- Marcar como no encontrado.
- Elegir otro candidato.
- Abrir en Spotify.

### 10.6. Exportación

Opciones:

- Crear playlist Spotify.
- Playlist pública/privada.
- Nombre personalizado.
- Exportar `.nml`.
- Exportar `.m3u8`.
- Copiar archivos de audio al destino.
- Generar informe CSV/JSON.

### 10.7. Resultado

Mostrar:

- Link a playlist Spotify.
- Ruta del `.nml`.
- Ruta del `.m3u8`.
- Tracks no encontrados.
- Botón “Exportar informe”.

---

## 11. Informes de salida

Generar siempre un informe por exportación:

```txt
exports/
  playlist-name/
    playlist-name.nml
    playlist-name.m3u8
    playlist-name_report.csv
    playlist-name_report.json
```

CSV mínimo:

```csv
playlist,position,source_title,source_artist,source_duration,spotify_status,spotify_title,spotify_artist,confidence,source_location
```

JSON completo:

```json
{
  "playlist": "My Playlist",
  "createdAt": "2026-06-22T00:00:00Z",
  "totalTracks": 120,
  "spotify": {
    "created": true,
    "url": "...",
    "matched": 98,
    "ambiguous": 12,
    "notFound": 10
  },
  "traktor": {
    "nmlPath": "...",
    "m3u8Path": "..."
  },
  "tracks": []
}
```

---

## 12. Estructura de carpetas

```txt
rekordbox-exporter/
  src/
    app/
      App.tsx
      routes/
      components/
    core/
      rekordbox/
        parseRekordboxXml.ts
        rekordboxTypes.ts
      spotify/
        spotifyClient.ts
        matchTracks.ts
        spotifyTypes.ts
      traktor/
        exportTraktor.ts
        nmlBuilder.ts
        m3uBuilder.ts
      common/
        normalizeText.ts
        filePaths.ts
        xmlUtils.ts
        scoring.ts
    db/
      sqlite.ts
      migrations/
    tests/
      fixtures/
        rekordbox/
        traktor/
  exports/
  .env.example
  README.md
  package.json
```

---

## 13. Fases de desarrollo

## Fase 1 — MVP local sin Spotify real

Objetivo: parsear Rekordbox XML y exportar M3U8.

Tareas:

1. Crear proyecto.
2. Crear UI básica.
3. Importar XML.
4. Parsear playlists.
5. Mostrar playlists.
6. Exportar `.m3u8`.
7. Generar informe JSON/CSV.
8. Tests con fixtures.

Criterio de éxito:

- La app carga un XML real de Rekordbox.
- Muestra las playlists correctamente.
- Exporta M3U8 con el orden correcto.
- No rompe con caracteres especiales.

---

## Fase 2 — Exportación NML para Traktor

Objetivo: generar `.nml` importable.

Tareas:

1. Analizar un NML real exportado desde Traktor.
2. Crear `nmlBuilder.ts`.
3. Generar XML válido.
4. Crear tests de estructura.
5. Exportar una playlist NML por cada playlist seleccionada.
6. Añadir opción de copiar archivos de audio.
7. Añadir guía de importación en Traktor.

Criterio de éxito:

- Traktor puede importar el `.nml`.
- El orden de tracks se mantiene.
- La mayoría de metadata básica aparece correctamente.
- Si NML falla, el M3U8 sigue disponible.

---

## Fase 3 — Spotify OAuth + búsqueda

Objetivo: conectar Spotify y encontrar matches.

Tareas:

1. Implementar OAuth PKCE.
2. Guardar sesión local.
3. Crear cliente Spotify.
4. Buscar tracks.
5. Implementar scoring.
6. Añadir caché SQLite.
7. Mostrar resultados por confianza.
8. Permitir revisión manual.

Criterio de éxito:

- El usuario puede loguearse.
- La app busca tracks.
- Los matches buenos se identifican automáticamente.
- Los dudosos se muestran para revisión.

---

## Fase 4 — Creación real de playlists Spotify

Objetivo: crear playlists y añadir tracks.

Tareas:

1. Crear playlist con `POST /me/playlists`.
2. Añadir tracks en lotes.
3. Gestionar errores y rate limits.
4. Crear descripción automática.
5. Mostrar link final.
6. Guardar resultado en historial local.

Criterio de éxito:

- La playlist aparece en Spotify.
- El orden de temas coincide con Rekordbox.
- Los temas no encontrados no bloquean la exportación.
- Se genera informe completo.

---

## Fase 5 — Pulido y seguridad

Objetivo: app usable de verdad.

Tareas:

1. Mejorar UI.
2. Añadir drag & drop de XML.
3. Añadir modo oscuro.
4. Añadir historial de exportaciones.
5. Añadir logs legibles.
6. Añadir backups de exportación.
7. Añadir empaquetado Windows.
8. Crear README completo.
9. Crear pantalla de “Ayuda / Cómo exportar desde Rekordbox”.
10. Añadir validaciones robustas.

---

## 14. Criterios de calidad

La app debe cumplir:

1. No modificar archivos originales de Rekordbox ni Traktor.
2. No tocar `collection.nml` directamente en el MVP.
3. No subir música ni XML a servidores externos.
4. Mantener el orden original de las playlists.
5. Mostrar claramente qué tracks no se han encontrado en Spotify.
6. Permitir revisión manual antes de crear playlists.
7. Generar siempre informe de exportación.
8. Soportar caracteres raros, tildes, símbolos, emojis y nombres largos.
9. Funcionar con rutas Windows.
10. Tener tests para parser XML, matching, M3U8 y NML.

---

## 15. Riesgos técnicos

### Riesgo 1: Spotify no encuentra muchos tracks

Mitigación:

- Matching flexible.
- Revisión manual.
- Informe de no encontrados.
- Caché de decisiones manuales.

### Riesgo 2: NML incompatible con alguna versión de Traktor

Mitigación:

- Exportar también M3U8.
- Usar fixtures reales de Traktor.
- No editar collection.nml.
- Añadir aviso de compatibilidad experimental para NML.

### Riesgo 3: Metadata sucia desde Rekordbox

Mitigación:

- Normalización de texto.
- Scoring por duración.
- Manual review.
- Opción de editar query de búsqueda.

### Riesgo 4: Rate limit de Spotify

Mitigación:

- Backoff exponencial.
- Cola de búsqueda.
- Caché SQLite.
- Reintentos controlados.

### Riesgo 5: Rutas de archivos inválidas

Mitigación:

- Validar existencia.
- Mostrar tracks con ruta rota.
- Permitir definir carpeta base.
- Permitir exportar M3U8 aunque falten archivos, marcando warnings.

---

## 16. Entregables esperados

Generar:

1. App funcional.
2. Código limpio y modular.
3. README con:
   - Instalación.
   - Configuración Spotify.
   - Cómo exportar XML desde Rekordbox.
   - Cómo importar `.nml`/`.m3u8` en Traktor.
4. `.env.example`.
5. Tests.
6. Fixtures de ejemplo.
7. Build para Windows.
8. Informe de limitaciones conocidas.

---

## 17. Primer objetivo concreto

Empieza implementando solo esto:

1. Crear proyecto React + TypeScript + Tauri/Electron.
2. Crear importador de XML Rekordbox.
3. Parsear tracks y playlists.
4. Mostrar playlists en UI.
5. Exportar una playlist seleccionada como `.m3u8`.
6. Generar informe `.json`.

No implementes Spotify ni NML hasta que el parser de Rekordbox y el exportador M3U8 estén funcionando perfectamente.

Después, continúa con NML.
Después, continúa con Spotify.

---

## 18. Prompt breve para Antigravity

Usa este prompt si quieres dar una orden compacta al agente:

```txt
Crea una aplicación de escritorio local llamada Rekordbox Playlist Exporter. Objetivo: importar XML de Rekordbox, leer colección y playlists, mantener el orden de los tracks, exportar playlists a M3U8 y NML para Traktor, y posteriormente crear playlists equivalentes en Spotify usando OAuth PKCE y Spotify Web API. Usa React + TypeScript + Vite y Tauri o Electron. Prioriza privacidad local: no subir XML ni música a servidores. Fase 1: solo parser Rekordbox XML + UI básica + exportación M3U8 + informe JSON/CSV. Fase 2: exportación NML compatible con Traktor usando fixtures reales. Fase 3: integración Spotify con búsqueda, scoring fuzzy, revisión manual y creación de playlists. No edites nunca collection.nml directamente. Genera tests para parser, matching y exportadores. Crea README, .env.example, estructura modular y build Windows.
```

---

## 19. Recomendación estratégica

No empieces por Spotify.

La parte más frágil no es crear la playlist, sino hacer bien el parser de Rekordbox y conservar orden, rutas y metadata. Primero haz que convierta XML → M3U8/NML de forma fiable; luego añade Spotify como capa encima.

Orden recomendado:

1. Rekordbox XML → modelo interno.
2. Modelo interno → M3U8.
3. Modelo interno → NML.
4. Modelo interno → Spotify search.
5. Revisión manual.
6. Creación de playlist Spotify.
7. Informes y pulido.

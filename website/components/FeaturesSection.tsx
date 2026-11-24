"use client";
import { useLocale } from "./LocaleContext";

const featuresEn = [
  {
    icon: "🎵",
    title: "XML, M3U8 & UTF-16 TXT",
    description:
      "Drag & drop any Rekordbox export format — full XML collections (including file://localhost/ URIs), M3U8 playlists, or UTF-16LE TXT exports in English or Spanish.",
    accent: "var(--rekordbox-blue)",
  },
  {
    icon: "🎛️",
    title: "Native Traktor NML v19",
    description:
      "Generates standalone Traktor Pro NML files with exact Traktor DIR/VOLUME/PRIMARYKEY paths, BPM, Open Key mapping, Hot Cues & Loops — without ever modifying your collection.nml.",
    accent: "var(--traktor-white)",
  },
  {
    icon: "💚",
    title: "Spotify Fuzzy Matching + Review",
    description:
      "Multi-query search scores candidates by title, artist, duration & remix, then lets you manually review, override or skip bootlegs before creating public or private playlists.",
    accent: "var(--spotify-green)",
  },
  {
    icon: "📁",
    title: "Folder Hierarchy & Portable Audio",
    description:
      "Preserve nested Rekordbox folder trees, export relative M3U8 paths, or copy audio files directly into the output directory for plug-and-play USB backups.",
    accent: "var(--rekordbox-blue)",
  },
  {
    icon: "📊",
    title: "Unified CSV & JSON Reports",
    description:
      "Every export generates detailed CSV and JSON logs with disk file verification, missing paths, and per-track Spotify match confidence.",
    accent: "var(--traktor-white)",
  },
  {
    icon: "🔒",
    title: "100% Local & Private",
    description:
      "No cloud uploads, no accounts, no telemetry. Spotify uses direct OAuth 2.0 PKCE with locally encrypted tokens and automatic refresh.",
    accent: "var(--spotify-green)",
  },
];

const featuresEs = [
  {
    icon: "🎵",
    title: "XML, M3U8 y TXT UTF-16",
    description:
      "Arrastra cualquier exportación de Rekordbox: colecciones XML completas (con rutas file://localhost/), playlists M3U8 o TXT en UTF-16LE en inglés o español.",
    accent: "var(--rekordbox-blue)",
  },
  {
    icon: "🎛️",
    title: "Traktor NML v19 Nativo",
    description:
      "Genera archivos .nml independientes para Traktor Pro con rutas nativas DIR/VOLUME/PRIMARYKEY, BPM, Open Key, Hot Cues y Loops — sin tocar nunca tu collection.nml.",
    accent: "var(--traktor-white)",
  },
  {
    icon: "💚",
    title: "Spotify Fuzzy + Revisión Manual",
    description:
      "Búsqueda multi-consulta con puntuación por título, artista, duración y remix. Revisa coincidencias dudosas o busca manualmente antes de crear la playlist.",
    accent: "var(--spotify-green)",
  },
  {
    icon: "📁",
    title: "Carpetas y Audio Portable",
    description:
      "Conserva las carpetas anidadas de Rekordbox, usa rutas relativas en M3U8 o copia los audios a destino para crear copias listas para pendrive USB.",
    accent: "var(--rekordbox-blue)",
  },
  {
    icon: "📊",
    title: "Informes CSV y JSON",
    description:
      "Cada exportación genera informes completos con verificación de archivos en disco, rutas rotas y estado/confianza de cada track en Spotify.",
    accent: "var(--traktor-white)",
  },
  {
    icon: "🔒",
    title: "100% Local y Privado",
    description:
      "Sin servidores intermedios ni subida de tu música. Spotify funciona vía OAuth 2.0 PKCE directo con tokens cifrados localmente y renovación automática.",
    accent: "var(--spotify-green)",
  },
];

export default function FeaturesSection() {
  const { locale } = useLocale();
  const features = locale === "es" ? featuresEs : featuresEn;

  return (
    <section
      id="features"
      className="py-24 relative overflow-hidden"
      style={{ background: "var(--bg-elevated)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--rekordbox-blue), var(--traktor-white), var(--spotify-green), transparent)",
          opacity: 0.3,
        }}
      />

      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "var(--spotify-green)" }}
          >
            {locale === "es" ? "Características" : "Features"}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight">
            {locale === "es" ? "Todo lo que necesita un DJ" : "Everything a DJ needs"}
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            {locale === "es"
              ? "Construido por DJs para DJs. Conserva el orden exacto y cada metadato clave al cambiar de plataforma."
              : "Built by DJs for DJs. Preserves exact track order and essential Rekordbox metadata across platforms."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-200 cursor-default"
              style={{ borderColor: `${f.accent}22` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5"
                style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}33` }}
              >
                {f.icon}
              </div>
              <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {f.description}
              </p>
              <div
                className="mt-5 h-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, ${f.accent}, transparent)` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

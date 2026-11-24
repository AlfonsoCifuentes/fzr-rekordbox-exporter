"use client";
import { useLocale } from "./LocaleContext";
import {
  FormatsSvgIcon,
  TraktorDeckSvgIcon,
  SpotifySignalSvgIcon,
  HarmonicWaveSvgIcon,
  FolderSyncSvgIcon,
  ShieldLocalSvgIcon,
} from "./BrandIcons";

export default function FeaturesSection() {
  const { locale } = useLocale();

  const features = [
    {
      icon: <FormatsSvgIcon color="#52b8ff" />,
      title: locale === "es" ? "XML, NML, Serato, VDJ y Spotify URL" : "XML, NML, Serato, VDJ & Spotify URL",
      description:
        locale === "es"
          ? "Importa Rekordbox XML, Traktor NML, Serato .crate, VirtualDJ XML, M3U8, TXT, CSV o pega directamente una URL pública de Spotify."
          : "Import Rekordbox XML, Traktor NML, Serato .crate, VirtualDJ XML, M3U8, TXT, CSV or paste any public Spotify playlist URL.",
      accent: "#0095ff",
      tag: "MULTI-INPUT",
    },
    {
      icon: <TraktorDeckSvgIcon color="#ff9947" />,
      title: locale === "es" ? "Traktor NML v19 ⇄ Rekordbox XML" : "Traktor NML v19 ⇄ Rekordbox XML",
      description:
        locale === "es"
          ? "Conversión bidireccional preservando BPM, Open Key ↔ Camelot, Hot Cues, Loops y rutas nativas sin tocar tu collection.nml."
          : "Bidirectional conversion preserving BPM, Open Key ↔ Camelot, Hot Cues, Loops & native paths without modifying collection.nml.",
      accent: "#ff7a1a",
      tag: "BIDIRECTIONAL",
    },
    {
      icon: <SpotifySignalSvgIcon color="#3ee87b" />,
      title: locale === "es" ? "Spotify Fuzzy + Revisión Manual" : "Spotify Fuzzy + Manual Review",
      description:
        locale === "es"
          ? "Búsqueda multi-consulta con puntuación 0–100 por título, artista, duración y remix. Corrige temas dudosos antes de crear playlists."
          : "Multi-query search scoring candidates 0–100 by title, artist, duration & remix, with live manual override before publishing.",
      accent: "#1db954",
      tag: "PKCE OAUTH",
    },
    {
      icon: <FolderSyncSvgIcon color="#5ce1ff" />,
      title: locale === "es" ? "FZR Soulseek Autopilot Integrado" : "Built-in FZR Soulseek Autopilot",
      description:
        locale === "es"
          ? "Protocolo nativo (sin OCR ni Python): filtros Hi-Res / FLAC / 320+, presets anti-ban, Dry-Run, Pausa/Reanudar e informes JSON."
          : "Native Soulseek protocol (zero OCR/Python): Hi-Res / FLAC / 320+ filters, anti-ban presets, Dry-Run, Pause/Resume & JSON reports.",
      accent: "#00d4ff",
      tag: "AUTOPILOT v2.0",
    },
    {
      icon: <HarmonicWaveSvgIcon color="#52b8ff" />,
      title: locale === "es" ? "Rueda Camelot, Curva BPM y Prep HTML" : "Camelot Wheel, BPM Curve & Prep HTML",
      description:
        locale === "es"
          ? "Rueda Camelot interactiva, auto-orden armónico, limpiador de tags, corrección BPM ×2/÷2, zonas BPM, Diff y hoja imprimible de cabina."
          : "Interactive Camelot Wheel, harmonic auto-sort, tag cleaner, half/double BPM fixer, BPM zones, visual Diff & printable Booth Prep Sheet.",
      accent: "#0095ff",
      tag: "DJ ANALYTICS",
    },
    {
      icon: <ShieldLocalSvgIcon color="#3ee87b" />,
      title: locale === "es" ? "100% Local, Cifrado y Open Source" : "100% Local, Encrypted & Open Source",
      description:
        locale === "es"
          ? "Sin servidores intermedios ni suscripciones. Credenciales cifradas con Windows DPAPI, relocalizador automático en disco y Web Deck client-side."
          : "Zero cloud uploads or subscriptions. Windows DPAPI encrypted credentials, automatic local disk relocator & client-side Web Deck.",
      accent: "#1db954",
      tag: "MIT LICENSE",
    },
  ];

  return (
    <section
      id="features"
      className="py-24 relative overflow-hidden"
      style={{ background: "var(--bg-elevated)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-px tri-divider opacity-40" />

      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <p
            className="text-xs font-mono font-bold tracking-widest uppercase mb-3"
            style={{ color: "var(--spotify-green)" }}
          >
            {locale === "es" ? "Características Studio" : "Studio Capabilities"}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight font-display">
            {locale === "es" ? "Diseñado para cabinas reales" : "Engineered for real DJ booths"}
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            {locale === "es"
              ? "La precisión técnica de Rekordbox y Traktor combinada con la fluidez de Spotify."
              : "The hardware precision of Rekordbox & Traktor fused with the effortless clarity of Spotify."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-200 relative overflow-hidden"
              style={{
                borderTop: `2px solid ${f.accent}70`,
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${f.accent}18`,
                    border: `1px solid ${f.accent}40`,
                  }}
                >
                  {f.icon}
                </div>
                <span
                  className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full"
                  style={{
                    background: `${f.accent}14`,
                    color: f.accent,
                    border: `1px solid ${f.accent}33`,
                  }}
                >
                  {f.tag}
                </span>
              </div>

              <h3 className="text-base font-bold mb-2 font-display" style={{ color: "var(--text-primary)" }}>
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

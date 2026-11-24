"use client";
import { useLocale } from "./LocaleContext";

const stepsEn = [
  {
    number: "01",
    title: "Export from Rekordbox",
    description:
      "In Rekordbox go to File → Export Collection in rekordbox xml format, or right-click any playlist and export as M3U8 or TXT.",
    accent: "var(--rekordbox-blue)",
    detail: "XML · M3U8 · M3U · TXT (UTF-16)",
  },
  {
    number: "02",
    title: "Drag & drop into FZR Exporter",
    description:
      "Drop your file directly onto FZR Rekordbox Exporter. Format, encoding, folders, BPM, musical keys, and Hot Cues are parsed automatically.",
    accent: "var(--traktor-white)",
    detail: "Auto-detected format & encoding",
  },
  {
    number: "03",
    title: "Inspect & select playlists",
    description:
      "Filter your playlist tree, preview tracks with BPM/Key/Cue counts, and spot missing local audio paths before exporting.",
    accent: "var(--rekordbox-blue)",
    detail: "Live track preview & disk check",
  },
  {
    number: "04",
    title: "Review Spotify matches & choose formats",
    description:
      "Pick Traktor NML v19, M3U8 (absolute or relative), portable audio copy, or Spotify. Review ambiguous Spotify tracks manually before creation.",
    accent: "var(--traktor-white)",
    detail: "NML v19 · M3U8 · Spotify · CSV · JSON",
  },
  {
    number: "05",
    title: "Done — ready for the booth",
    description:
      "Open the generated folder, import directly into Traktor Pro, or launch your new Spotify playlist with full unmatched track reports.",
    accent: "var(--spotify-green)",
    detail: "Zero friction results",
  },
];

const stepsEs = [
  {
    number: "01",
    title: "Exporta desde Rekordbox",
    description:
      "En Rekordbox ve a File → Export Collection in rekordbox xml format, o haz clic derecho en una playlist para exportar en M3U8 o TXT.",
    accent: "var(--rekordbox-blue)",
    detail: "XML · M3U8 · M3U · TXT (UTF-16)",
  },
  {
    number: "02",
    title: "Arrastra y suelta en FZR Exporter",
    description:
      "Suelta tu archivo directamente sobre la ventana. Detectamos formato, codificación, carpetas, BPM, tonalidad y Hot Cues automáticamente.",
    accent: "var(--traktor-white)",
    detail: "Detección automática",
  },
  {
    number: "03",
    title: "Previsualiza y elige playlists",
    description:
      "Filtra tus playlists por nombre o carpeta, inspecciona pistas con BPM/Key/Cues y verifica qué archivos existen en disco.",
    accent: "var(--rekordbox-blue)",
    detail: "Vista previa y control de rutas",
  },
  {
    number: "04",
    title: "Revisa Spotify y elige formatos",
    description:
      "Selecciona Traktor NML v19, M3U8 (absoluto o relativo), copia de audio portable o Spotify. Corrige temas dudosos en Spotify antes de crear la playlist.",
    accent: "var(--traktor-white)",
    detail: "NML v19 · M3U8 · Spotify · CSV · JSON",
  },
  {
    number: "05",
    title: "Listo para la cabina",
    description:
      "Abre la carpeta generada para importar en Traktor Pro o abre tu nueva playlist de Spotify con informe completo de temas no encontrados.",
    accent: "var(--spotify-green)",
    detail: "Resultados al instante",
  },
];

export default function HowItWorksSection() {
  const { locale } = useLocale();
  const steps = locale === "es" ? stepsEs : stepsEn;

  return (
    <section
      id="how-it-works"
      className="py-24 grid-bg"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "var(--rekordbox-blue)" }}
          >
            {locale === "es" ? "Cómo funciona" : "How it works"}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight">
            {locale === "es" ? "Cinco pasos, cero fricción" : "Five steps, zero friction"}
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            {locale === "es"
              ? "Sin suscripciones. Sin subir tu música a la nube. Solo tus archivos y tus playlists."
              : "No subscriptions. No cloud uploads. Just your files and your music."}
          </p>
        </div>

        <div className="relative">
          <div
            className="absolute left-5 top-0 bottom-0 w-px hidden md:block"
            style={{
              background:
                "linear-gradient(180deg, var(--rekordbox-blue), var(--traktor-white), var(--spotify-green))",
              opacity: 0.2,
            }}
          />

          <div className="flex flex-col gap-6">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="flex flex-col md:flex-row gap-4 md:gap-8 items-start md:items-center group"
              >
                <div
                  className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: `${step.accent}20`,
                    border: `2px solid ${step.accent}`,
                    color: step.accent,
                    boxShadow: `0 0 20px ${step.accent}33`,
                  }}
                >
                  {i + 1}
                </div>

                <div className="glass rounded-2xl p-5 flex-1 group-hover:border-white/10 transition-all duration-200">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                      {step.title}
                    </h3>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: `${step.accent}15`,
                        color: step.accent,
                        border: `1px solid ${step.accent}33`,
                      }}
                    >
                      {step.detail}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

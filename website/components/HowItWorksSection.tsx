"use client";
import { useLocale } from "./LocaleContext";

const stepsEn = [
  {
    number: "01",
    deckTag: "INPUT",
    title: "Export from your DJ software",
    description:
      "Export a Rekordbox XML, Traktor NML, Serato .crate, VirtualDJ database.xml, M3U8, TXT, or CSV playlist — no cloud sync required.",
    accent: "#0095ff",
    detail: "XML · NML · .CRATE · VDJ · M3U8 · CSV",
  },
  {
    number: "02",
    deckTag: "INGEST",
    title: "Drop straight into FZR Booth OS",
    description:
      "Drag your file onto the desktop app or Online Web Deck. Encoding, folder trees, BPM, Open Key / Camelot, and Hot Cues parse instantly.",
    accent: "#7fd3ff",
    detail: "Auto-detected format & UTF-16/UTF-8",
  },
  {
    number: "03",
    deckTag: "PREP",
    title: "Analyze, clean & sort harmonically",
    description:
      "Inspect the interactive Camelot Wheel and BPM curve, clean dirty download tags, fix half/double BPM, auto-sort harmonically, and repair broken audio paths.",
    accent: "#ff7a1a",
    detail: "Camelot Wheel · Tag Cleaner · Disk Relocator",
  },
  {
    number: "04",
    deckTag: "BRIDGE",
    title: "Review Spotify matches & pick outputs",
    description:
      "Choose Traktor NML v19, Rekordbox XML, M3U8, HTML Booth Prep Sheet, CUE Sheet, or Spotify PKCE. Confirm ambiguous matches visually before export.",
    accent: "#e8edf7",
    detail: "NML v19 · RB XML · Spotify PKCE · HTML Prep",
  },
  {
    number: "05",
    deckTag: "BOOTH",
    title: "Ready to play live",
    description:
      "Import your converted collection directly into Traktor Pro or Rekordbox, launch your synced Spotify playlist, or print your Booth Prep Sheet.",
    accent: "#1db954",
    detail: "100% local · Zero friction",
  },
];

const stepsEs = [
  {
    number: "01",
    deckTag: "ENTRADA",
    title: "Exporta desde tu software DJ",
    description:
      "Exporta tu XML de Rekordbox, NML de Traktor, .crate de Serato, database.xml de VirtualDJ, M3U8, TXT o CSV — sin subir archivos a la nube.",
    accent: "#0095ff",
    detail: "XML · NML · .CRATE · VDJ · M3U8 · CSV",
  },
  {
    number: "02",
    deckTag: "LECTURA",
    title: "Arrastra y suelta en FZR Booth OS",
    description:
      "Suelta tu archivo en la app de escritorio o el Web Deck Online. Detectamos formato, carpetas, BPM, tonalidad Open Key / Camelot y Hot Cues al instante.",
    accent: "#7fd3ff",
    detail: "Detección automática · UTF-16 / UTF-8",
  },
  {
    number: "03",
    deckTag: "PREP",
    title: "Analiza, limpia y ordena por Camelot",
    description:
      "Inspecciona la Rueda Camelot y la curva BPM, limpia tags sucios de descarga, corrige BPM ×2/÷2, auto-ordena armónicamente y repara rutas rotas.",
    accent: "#ff7a1a",
    detail: "Rueda Camelot · Limpiador · Auto-Relocator",
  },
  {
    number: "04",
    deckTag: "PUENTE",
    title: "Revisa Spotify y elige formatos",
    description:
      "Elige Traktor NML v19, Rekordbox XML, M3U8, Hoja HTML de Cabina, CUE Sheet o Spotify PKCE. Confirma matches dudosos visualmente antes de exportar.",
    accent: "#e8edf7",
    detail: "NML v19 · RB XML · Spotify PKCE · HTML Prep",
  },
  {
    number: "05",
    deckTag: "CABINA",
    title: "Listo para pinchar en directo",
    description:
      "Importa tu librería convertida en Traktor Pro o Rekordbox, abre tu nueva playlist en Spotify o imprime tu Hoja de Cabina con cues y tonalidades.",
    accent: "#1db954",
    detail: "100% local · Cero fricción",
  },
];

export default function HowItWorksSection() {
  const { locale } = useLocale();
  const steps = locale === "es" ? stepsEs : stepsEn;

  return (
    <section
      id="how-it-works"
      className="py-24 grid-bg relative"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-16">
          <p
            className="text-xs font-mono font-bold tracking-widest uppercase mb-4"
            style={{ color: "var(--rekordbox-blue)" }}
          >
            {locale === "es" ? "FLUJO DE SEÑAL" : "SIGNAL FLOW"}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight font-display">
            {locale === "es" ? "Cinco pasos, cero fricción" : "Five steps, zero friction"}
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            {locale === "es"
              ? "Sin suscripciones. Sin subir tu música a la nube. Solo tus archivos y tus playlists."
              : "No subscriptions. No cloud uploads. Just your files and your playlists."}
          </p>
        </div>

        <div className="relative">
          {/* Illuminated vertical signal bus */}
          <div
            className="absolute left-6 top-4 bottom-4 w-[2px] hidden md:block rounded-full"
            style={{
              background:
                "linear-gradient(180deg, #0095ff 0%, #7fd3ff 28%, #ff7a1a 55%, #e8edf7 78%, #1db954 100%)",
              opacity: 0.3,
            }}
          />

          <div className="flex flex-col gap-5">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex flex-col md:flex-row gap-4 md:gap-7 items-start md:items-center group"
              >
                {/* Hardware Rack LED Node */}
                <div
                  className="relative z-10 w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-mono flex-shrink-0 transition-all duration-300 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(180deg, ${step.accent}22 0%, rgba(10,13,20,0.95) 100%)`,
                    border: `1.5px solid ${step.accent}88`,
                    color: step.accent,
                    boxShadow: `0 0 22px ${step.accent}25`,
                  }}
                >
                  <span className="text-sm font-black leading-none">{step.number}</span>
                  <span className="text-[8px] font-bold tracking-widest opacity-80 mt-0.5">
                    {step.deckTag}
                  </span>
                </div>

                {/* Rack Module Card */}
                <div
                  className="deck-console rounded-2xl p-5 sm:p-6 flex-1 w-full transition-all duration-200 group-hover:border-white/20 relative overflow-hidden"
                  style={{ borderColor: `${step.accent}24` }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
                    style={{
                      background: `linear-gradient(90deg, ${step.accent}, transparent 65%)`,
                    }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {step.title}
                    </h3>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold"
                      style={{
                        background: `${step.accent}14`,
                        color: step.accent,
                        border: `1px solid ${step.accent}35`,
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

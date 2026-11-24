"use client";
import { useLocale } from "./LocaleContext";

export default function CompatibilitySection() {
  const { locale } = useLocale();

  const brands = [
    {
      name: "Rekordbox",
      logo: "RB",
      color: "#0095ff",
      description:
        locale === "es"
          ? "Estándar de cabina Pioneer DJ / AlphaTheta con Hot Cues y carpetas."
          : "Pioneer DJ / AlphaTheta club standard with Hot Cues & folders.",
      formats:
        locale === "es"
          ? [
              "XML Collection (Cues, Loops, Carpetas)",
              "Exportación directa a Rekordbox XML",
              "Playlists M3U8 / M3U y TXT (UTF-16)",
            ]
          : [
              "XML Collection (Cues, Loops, Folders)",
              "Direct Rekordbox XML builder",
              "M3U8 / M3U & TXT (UTF-16 / UTF-8)",
            ],
      version: "Rekordbox 5, 6 & 7",
      status: "both" as const,
    },
    {
      name: "Traktor Pro",
      logo: "TR",
      color: "#ff7a1a",
      description:
        locale === "es"
          ? "Motor DJ de Native Instruments con Open Key y CUE_V2 nativos."
          : "Native Instruments pro DJ engine with native Open Key & CUE_V2.",
      formats:
        locale === "es"
          ? [
              "NML v19 (BPM, Open Key, CUE_V2)",
              "Lectura e importación de collection.nml",
              "M3U8 (absoluto/relativo) + copia USB",
            ]
          : [
              "NML v19 (BPM, Open Key, CUE_V2)",
              "Native collection.nml import",
              "M3U8 (absolute/relative) + USB copy",
            ],
      version: "Traktor Pro 3 & 4",
      status: "both" as const,
    },
    {
      name: "Serato & VDJ",
      logo: "SV",
      color: "#7fd3ff",
      description:
        locale === "es"
          ? "Importación directa desde crates binarios de Serato y librerías VirtualDJ."
          : "Direct import from binary Serato crates & VirtualDJ databases.",
      formats:
        locale === "es"
          ? [
              "Serato DJ binary .crate (UTF-16BE)",
              "VirtualDJ database.xml (BPM, Key, Cues)",
              "CSV universal / Soundiiz / TuneMyMusic",
            ]
          : [
              "Serato DJ binary .crate (UTF-16BE)",
              "VirtualDJ database.xml (BPM, Key, Cues)",
              "Universal CSV / Soundiiz / TuneMyMusic",
            ],
      version: "Serato DJ Pro · VDJ 2024+",
      status: "import" as const,
    },
    {
      name: "Spotify & Web",
      logo: "SP",
      color: "#1db954",
      description:
        locale === "es"
          ? "Creación directa por OAuth PKCE, fuzzy matching y hoja de cabina."
          : "Direct OAuth PKCE sync, fuzzy track matching & Booth Prep Sheets.",
      formats:
        locale === "es"
          ? [
              "Playlists Públicas y Privadas (PKCE)",
              "Revisión manual con medidor de %",
              "HTML Booth Prep, CUE Sheet y CSV",
            ]
          : [
              "Public & Private Playlists (PKCE)",
              "Manual review with % confidence bar",
              "HTML Booth Prep, CUE Sheet & CSV",
            ],
      version: "Spotify Web API v1 (PKCE)",
      status: "export" as const,
    },
  ];

  return (
    <section
      id="compatibility"
      className="py-24 relative"
      style={{ background: "var(--bg-elevated)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--rekordbox-blue), var(--traktor-amber), var(--spotify-green), transparent)",
          opacity: 0.32,
        }}
      />

      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <p
            className="text-xs font-mono font-bold tracking-widest uppercase mb-4"
            style={{ color: "#ffab5e" }}
          >
            {locale === "es" ? "MATRIZ DE COMPATIBILIDAD" : "COMPATIBILITY MATRIX"}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight font-display">
            {locale === "es" ? (
              <>
                Todos los ecosistemas, <span className="gradient-text">un puente</span>
              </>
            ) : (
              <>
                Every DJ ecosystem, <span className="gradient-text">one bridge</span>
              </>
            )}
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            {locale === "es"
              ? "FZR Booth OS habla el formato nativo de tu cabina y de tus plataformas de streaming."
              : "FZR Booth OS speaks the native format of your DJ booth and streaming platforms."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {brands.map((brand) => {
            const badgeText =
              brand.status === "both"
                ? locale === "es"
                  ? "⇅ Entrada / Salida"
                  : "⇅ Import / Export"
                : brand.status === "import"
                  ? locale === "es"
                    ? "↑ Entrada nativa"
                    : "↑ Native Import"
                  : locale === "es"
                    ? "↓ Salida pro"
                    : "↓ Pro Export";

            return (
              <div
                key={brand.name}
                className="deck-console rounded-2xl p-6 flex flex-col gap-5 hover:scale-[1.015] transition-all duration-200 relative overflow-hidden"
                style={{ borderColor: `${brand.color}30` }}
              >
                {/* Illuminated Top Deck Strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background: `linear-gradient(90deg, ${brand.color}, transparent 85%)`,
                  }}
                />

                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-base flex-shrink-0"
                    style={{
                      background: `linear-gradient(180deg, ${brand.color}24 0%, ${brand.color}0a 100%)`,
                      border: `1px solid ${brand.color}55`,
                      color: brand.color,
                      boxShadow: `0 0 18px ${brand.color}22`,
                    }}
                  >
                    {brand.logo}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-white truncate">
                      {brand.name}
                    </h3>
                    <span
                      className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-full font-bold mt-0.5"
                      style={{
                        background: `${brand.color}1a`,
                        color: brand.color,
                        border: `1px solid ${brand.color}38`,
                      }}
                    >
                      {badgeText}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {brand.description}
                </p>

                <div>
                  <p className="text-[10px] font-mono font-bold tracking-wider mb-2.5" style={{ color: "var(--text-subtle)" }}>
                    {locale === "es" ? "FORMATOS SOPORTADOS" : "SUPPORTED FORMATS"}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {brand.formats.map((fmt) => (
                      <li key={fmt} className="flex items-start gap-2 text-xs leading-snug">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                          style={{ background: brand.color, boxShadow: `0 0 6px ${brand.color}` }}
                        />
                        <span style={{ color: "var(--text-muted)" }}>{fmt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="mt-auto pt-3.5 border-t text-[11px] font-mono flex items-center justify-between"
                  style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--text-subtle)" }}
                >
                  <span>{brand.version}</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: brand.color, opacity: 0.75 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

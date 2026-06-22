const steps = [
  {
    number: "01",
    title: "Export from Rekordbox",
    description:
      "In Rekordbox go to File → Export Collection in xml format, or export your playlist as M3U8 or TXT.",
    accent: "var(--rekordbox-blue)",
    detail: "Supports XML · M3U8 · M3U · TXT",
  },
  {
    number: "02",
    title: "Open in FZR Exporter",
    description:
      "Launch FZR Rekordbox Exporter, click «Importar exportación de Rekordbox» and select your file.",
    accent: "var(--traktor-white)",
    detail: "All formats auto-detected",
  },
  {
    number: "03",
    title: "Select playlists",
    description:
      "Browse your full playlist tree, select the playlists or folders you want to export, and apply filters.",
    accent: "var(--rekordbox-blue)",
    detail: "Folder-aware hierarchy",
  },
  {
    number: "04",
    title: "Choose export format",
    description:
      "Pick Traktor NML, M3U8 playlist, or Spotify. Toggle report generation for a per-track CSV/JSON log.",
    accent: "var(--traktor-white)",
    detail: "NML · M3U8 · Spotify · CSV · JSON",
  },
  {
    number: "05",
    title: "Done",
    description:
      "Your playlists are exported in seconds. Open the output folder or check the report for any unmatched tracks.",
    accent: "var(--spotify-green)",
    detail: "Instant results",
  },
];

export default function HowItWorksSection() {
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
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Five steps, zero friction
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            No accounts. No subscriptions. No cloud. Just your files and your music.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
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
                {/* Number bubble */}
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

                {/* Content */}
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

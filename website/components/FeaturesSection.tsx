const features = [
  {
    icon: "🎵",
    title: "XML, M3U8 & TXT",
    description:
      "Import from any Rekordbox export format. Older Rekordbox versions that only export TXT or M3U8 are fully supported.",
    accent: "var(--rekordbox-blue)",
  },
  {
    icon: "🎧",
    title: "Traktor NML Export",
    description:
      "Generate native Traktor NML playlists with full collection entries, preserving BPM, key, cue points and file paths.",
    accent: "var(--traktor-white)",
  },
  {
    icon: "💚",
    title: "Spotify Playlists",
    description:
      "Smart track matching with fuzzy search finds your tracks on Spotify even with slight title differences.",
    accent: "var(--spotify-green)",
  },
  {
    icon: "📁",
    title: "Folder Structure",
    description:
      "Exports respect your Rekordbox folder hierarchy. Nested playlist folders become neatly organized output directories.",
    accent: "var(--rekordbox-blue)",
  },
  {
    icon: "📊",
    title: "Detailed Reports",
    description:
      "Every export generates a JSON and CSV report with per-track status, so you always know exactly what was exported.",
    accent: "var(--traktor-white)",
  },
  {
    icon: "🔒",
    title: "100% Offline",
    description:
      "Your library stays local. No cloud upload, no login required (except optional Spotify OAuth). Your data never leaves your machine.",
    accent: "var(--spotify-green)",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-24 relative overflow-hidden"
      style={{ background: "var(--bg-elevated)" }}
    >
      {/* Top divider glow */}
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
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Everything a DJ needs
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Built by DJs for DJs. Every detail from Rekordbox metadata is
            preserved in the target format.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-200 cursor-default"
              style={{
                borderColor: `${f.accent}22`,
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5"
                style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}33` }}
              >
                {f.icon}
              </div>
              <h3
                className="text-base font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {f.description}
              </p>
              {/* Bottom accent line */}
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

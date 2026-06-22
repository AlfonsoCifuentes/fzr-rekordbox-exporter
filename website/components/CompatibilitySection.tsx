const brands = [
  {
    name: "Rekordbox",
    logo: "RB",
    color: "var(--rekordbox-blue)",
    description: "Pioneer DJ's flagship library management software",
    formats: ["XML Collection", "M3U8 Playlist", "M3U Playlist", "TXT Export"],
    version: "Rekordbox 5, 6 & 7",
    status: "import",
  },
  {
    name: "Traktor",
    logo: "TR",
    color: "var(--traktor-white)",
    description: "Native Instruments' professional DJ software",
    formats: ["NML Collection", "M3U8 Playlist"],
    version: "Traktor 3.x",
    status: "export",
  },
  {
    name: "Spotify",
    logo: "SP",
    color: "var(--spotify-green)",
    description: "The world's largest music streaming platform",
    formats: ["Public Playlists", "Private Playlists"],
    version: "Spotify API v1",
    status: "export",
  },
];

export default function CompatibilitySection() {
  return (
    <section
      id="compatibility"
      className="py-24 relative"
      style={{ background: "var(--bg-elevated)" }}
    >
      {/* Top divider */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--traktor-white), transparent)",
          opacity: 0.15,
        }}
      />

      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "var(--traktor-white)" }}
          >
            Compatibility
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Three universes,{" "}
            <span className="gradient-text">one bridge</span>
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            FZR Rekordbox Exporter speaks the native language of each platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <div
              key={brand.name}
              className="glass rounded-2xl p-7 flex flex-col gap-5 hover:scale-[1.01] transition-all duration-200"
              style={{ borderColor: `${brand.color}22` }}
            >
              {/* Header */}
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg"
                  style={{
                    background: `${brand.color}18`,
                    border: `1px solid ${brand.color}40`,
                    color: brand.color,
                  }}
                >
                  {brand.logo}
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                    {brand.name}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background:
                        brand.status === "import"
                          ? "rgba(0,91,255,0.15)"
                          : "rgba(29,185,84,0.15)",
                      color: brand.status === "import" ? "var(--rekordbox-blue)" : "var(--spotify-green)",
                    }}
                  >
                    {brand.status === "import" ? "↑ Import" : "↓ Export"}
                  </span>
                </div>
              </div>

              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {brand.description}
              </p>

              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-subtle)" }}>
                  SUPPORTED FORMATS
                </p>
                <ul className="flex flex-col gap-1.5">
                  {brand.formats.map((fmt) => (
                    <li key={fmt} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: brand.color }}
                      />
                      <span style={{ color: "var(--text-muted)" }}>{fmt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="mt-auto pt-4 border-t text-xs"
                style={{ borderColor: "rgba(255,255,255,0.05)", color: "var(--text-subtle)" }}
              >
                {brand.version}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

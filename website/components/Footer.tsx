const GITHUB_REPO = "https://github.com/AlfonsoCifuentes/fzr-rekordbox-exporter";

export default function Footer() {
  return (
    <footer
      className="relative border-t py-12"
      style={{
        background: "var(--bg-elevated)",
        borderColor: "rgba(255,255,255,0.05)",
      }}
    >
      {/* Top gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--rekordbox-blue), var(--traktor-white), var(--spotify-green), transparent)",
          opacity: 0.25,
        }}
      />

      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <span
              className="text-xl font-black tracking-tight"
              style={{
                background:
                  "linear-gradient(90deg, var(--rekordbox-blue) 0%, var(--traktor-white) 50%, var(--spotify-green) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              FZR Rekordbox Exporter
            </span>
            <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
              Free & Open Source · MIT License
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm" style={{ color: "var(--text-muted)" }}>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <GitHubIcon />
              GitHub
            </a>
            <a
              href={`${GITHUB_REPO}/releases`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Releases
            </a>
            <a
              href={`${GITHUB_REPO}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Report a bug
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className="mt-8 pt-6 border-t text-center text-xs leading-relaxed"
          style={{ borderColor: "rgba(255,255,255,0.05)", color: "var(--text-subtle)" }}
        >
          <p>
            FZR Rekordbox Exporter is an independent open-source project and is not affiliated with,
            endorsed by, or connected to Pioneer DJ, Native Instruments, or Spotify AB.
          </p>
          <p className="mt-1">
            Rekordbox® is a trademark of Pioneer DJ Corporation.
            Traktor® is a trademark of Native Instruments GmbH.
            Spotify® is a trademark of Spotify AB.
          </p>
        </div>
      </div>
    </footer>
  );
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.37.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.06 1.82 2.79 1.29 3.47.99.1-.77.41-1.29.75-1.59-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 016 0c2.28-1.55 3.28-1.23 3.28-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57C20.57 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z"/>
    </svg>
  );
}

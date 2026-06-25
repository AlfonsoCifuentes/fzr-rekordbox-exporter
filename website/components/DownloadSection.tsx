"use client";

const GITHUB_REPO = "https://github.com/AlfonsoCifuentes/fzr-rekordbox-exporter";
const RELEASES_URL = `${GITHUB_REPO}/releases/tag/v1.1.0`;
const EXE_URL = `${GITHUB_REPO}/releases/download/v1.1.0/FZR-Rekordbox-Exporter-1.1.0-x64.exe`;

const requirements = [
  "Windows 10 / 11 (64-bit)",
  "4 GB RAM (8 GB recommended)",
  "200 MB free disk space",
  "Simple installer wizard (.exe)",
];

export default function DownloadSection() {
  return (
    <section
      id="download"
      className="py-24 relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(29,185,84,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-4xl mx-auto px-5 relative z-10">
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "var(--spotify-green)" }}
          >
            Download
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Get FZR Rekordbox Exporter
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: "var(--text-muted)" }}>
            Free, open source, no registration. Just download and install in seconds.
          </p>
        </div>

        {/* Main download card */}
        <div
          className="glass rounded-3xl p-8 mb-8"
          style={{
            background: "rgba(29,185,84,0.04)",
            borderColor: "rgba(29,185,84,0.2)",
          }}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* App icon placeholder */}
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,91,255,0.2), rgba(29,185,84,0.2))",
                border: "1px solid rgba(29,185,84,0.25)",
                boxShadow: "0 0 40px rgba(29,185,84,0.15)",
              }}
            >
              🎛️
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black mb-1" style={{ color: "var(--text-primary)" }}>
                FZR Rekordbox Exporter
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                Version 1.1.0 · Windows x64 · Installer ~180 MB
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <a
                  href={EXE_URL}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse-glow"
                  style={{ background: "var(--spotify-green)", color: "#000" }}
                >
                  <DownloadIcon />
                  Download Installer (.exe)
                </a>
                <a
                  href={RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold text-sm glass hover:border-white/20 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ color: "var(--text-muted)" }}
                >
                  <GitHubIcon />
                  All releases on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements + How to install side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="glass rounded-2xl p-6">
            <h4
              className="text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: "var(--rekordbox-blue)" }}
            >
              System Requirements
            </h4>
            <ul className="flex flex-col gap-2">
              {requirements.map((req) => (
                <li key={req} className="flex items-start gap-2 text-sm">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: "var(--rekordbox-blue)" }}
                  />
                  <span style={{ color: "var(--text-muted)" }}>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-6">
            <h4
              className="text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: "var(--traktor-white)" }}
            >
              How to Install
            </h4>
            <ol className="flex flex-col gap-2">
              {[
                "Download the .exe installer",
                "Run it and follow the wizard",
                "Choose install folder (optional)",
                "Launch from desktop shortcut",
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: "rgba(232,234,240,0.1)",
                      color: "var(--traktor-white)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footnote */}
        <p
          className="text-center text-xs mt-8"
          style={{ color: "var(--text-subtle)" }}
        >
          Windows may show a SmartScreen warning for unsigned apps. Click &quot;More info&quot; → &quot;Run anyway&quot;.
          The source code is{" "}
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white transition-colors"
          >
            fully open source on GitHub
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.37.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.06 1.82 2.79 1.29 3.47.99.1-.77.41-1.29.75-1.59-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 016 0c2.28-1.55 3.28-1.23 3.28-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57C20.57 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z"/>
    </svg>
  );
}

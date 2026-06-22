"use client";
import Link from "next/link";

const GITHUB_REPO = "https://github.com/AlfonsoCifuentes/fzr-rekordbox-exporter";
const RELEASES_URL = `${GITHUB_REPO}/releases/latest`;

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden grid-bg"
    >
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 20% 30%, rgba(0,91,255,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 60%, rgba(29,185,84,0.10) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 50% 80%, rgba(232,234,240,0.04) 0%, transparent 70%)
          `,
        }}
      />

      {/* Decorative vinyl ring */}
      <div
        className="pointer-events-none absolute top-20 right-[-80px] sm:right-[-30px] w-64 h-64 sm:w-80 sm:h-80 rounded-full opacity-10 animate-float"
        aria-hidden
        style={{
          border: "2px solid var(--rekordbox-blue)",
          boxShadow: "0 0 60px var(--glow-blue)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-20 left-[-60px] sm:left-[-20px] w-48 h-48 sm:w-60 sm:h-60 rounded-full opacity-10 animate-float"
        aria-hidden
        style={{
          border: "2px solid var(--spotify-green)",
          boxShadow: "0 0 60px var(--glow-green)",
          animationDelay: "2s",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-5 pt-28 pb-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 glass">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "var(--spotify-green)" }}
          />
          <span style={{ color: "var(--text-muted)" }}>
            Free &amp; Open Source · Windows 10/11 · v1.0.0
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] mb-6 tracking-tight">
          <span className="gradient-text">One click</span>
          <br />
          <span style={{ color: "var(--text-primary)" }}>
            from Rekordbox
          </span>
          <br />
          <span style={{ color: "var(--text-primary)", opacity: 0.7 }}>
            to everywhere
          </span>
        </h1>

        <p
          className="text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Export your Rekordbox playlists directly to{" "}
          <span style={{ color: "#1db954", fontWeight: 600 }}>Spotify</span> and{" "}
          <span style={{ color: "#e8eaf0", fontWeight: 600 }}>Traktor</span>.
          Supports XML, M3U8 and TXT. No internet needed. Fully offline.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link
            href="#download"
            className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-bold text-base transition-all duration-200 animate-pulse-glow hover:scale-105 active:scale-95"
            style={{ background: "var(--spotify-green)", color: "#000" }}
          >
            <DownloadIcon />
            Download for Windows
          </Link>
          <Link
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm glass hover:border-white/20 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ color: "var(--text-muted)" }}
          >
            <GitHubIcon />
            View on GitHub
          </Link>
        </div>

        {/* Tri-brand logos strip */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 opacity-40">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--rekordbox-blue)" }}>
            Rekordbox
          </span>
          <span className="w-px h-4 bg-current opacity-30" />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--traktor-white)" }}>
            Traktor
          </span>
          <span className="w-px h-4 bg-current opacity-30" />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--spotify-green)" }}>
            Spotify
          </span>
        </div>
      </div>

      {/* Waveform bottom decoration */}
      <div className="absolute bottom-8 left-0 right-0 flex items-end justify-center gap-0.5 h-12 overflow-hidden opacity-20 pointer-events-none" aria-hidden>
        {Array.from({ length: 60 }).map((_, i) => {
          const h = 20 + Math.sin(i * 0.4) * 16 + Math.sin(i * 0.13) * 12;
          const hue = i < 20 ? "var(--rekordbox-blue)" : i < 40 ? "var(--traktor-white)" : "var(--spotify-green)";
          return (
            <div
              key={i}
              className="w-1 rounded-full flex-shrink-0"
              style={{
                height: `${h}px`,
                background: hue,
              }}
            />
          );
        })}
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-30 pointer-events-none" aria-hidden>
        <div className="w-px h-8 bg-white rounded-full" style={{ animation: "fadeIn 1s ease 2s both" }} />
      </div>
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.37.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.06 1.82 2.79 1.29 3.47.99.1-.77.41-1.29.75-1.59-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 016 0c2.28-1.55 3.28-1.23 3.28-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57C20.57 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z"/>
    </svg>
  );
}

"use client";
import Link from "next/link";
import { useLocale } from "./LocaleContext";
import { GITHUB_REPO, useLatestRelease } from "./useLatestRelease";

export default function HeroSection() {
  const { locale } = useLocale();
  const release = useLatestRelease();

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

      {/* Decorative vinyl rings */}
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

      <div className="relative z-10 max-w-5xl mx-auto px-5 pt-28 pb-20 w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 glass">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "var(--spotify-green)" }}
          />
          <span style={{ color: "var(--text-muted)" }}>
            {locale === "es"
              ? `Gratis y Open Source · Windows 10/11 · ${release.tagName}`
              : `Free & Open Source · Windows 10/11 · ${release.tagName}`}
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] mb-6 tracking-tight">
          <span className="gradient-text">
            {locale === "es" ? "Un solo clic" : "One click"}
          </span>
          <br />
          <span style={{ color: "var(--text-primary)" }}>
            {locale === "es" ? "desde Rekordbox" : "from Rekordbox"}
          </span>
          <br />
          <span style={{ color: "var(--text-primary)", opacity: 0.72 }}>
            {locale === "es" ? "a cualquier cabina" : "to everywhere"}
          </span>
        </h1>

        <p
          className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {locale === "es" ? (
            <>
              Exporta tus playlists de Rekordbox directamente a{" "}
              <span style={{ color: "#e8eaf0", fontWeight: 600 }}>Traktor Pro</span> (NML v19 con
              cue points, BPM y Open Key) y{" "}
              <span style={{ color: "#1db954", fontWeight: 600 }}>Spotify</span> (matching fuzzy y
              revisión manual). Soporta XML, M3U8 y TXT. 100% local y privado.
            </>
          ) : (
            <>
              Export your Rekordbox playlists directly to{" "}
              <span style={{ color: "#e8eaf0", fontWeight: 600 }}>Traktor Pro</span> (native NML v19
              with cue points, BPM &amp; Open Key) and{" "}
              <span style={{ color: "#1db954", fontWeight: 600 }}>Spotify</span> (fuzzy matching &amp;
              manual review). Supports XML, M3U8 &amp; TXT. 100% local &amp; private.
            </>
          )}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="#download"
            className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-bold text-base transition-all duration-200 animate-pulse-glow hover:scale-105 active:scale-95"
            style={{ background: "var(--spotify-green)", color: "#000" }}
          >
            <DownloadIcon />
            {locale === "es" ? "Descargar para Windows" : "Download for Windows"}
          </Link>
          <Link
            href="#online-tool"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "rgba(0,91,255,0.16)",
              border: "1px solid rgba(0,91,255,0.4)",
              color: "#a7c8ff",
            }}
          >
            ✨ {locale === "es" ? "Probar conversor online" : "Try Online Converter"}
          </Link>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm glass hover:border-white/20 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ color: "var(--text-muted)" }}
          >
            <GitHubIcon />
            {locale === "es" ? "Ver en GitHub" : "View on GitHub"}
          </a>
        </div>

        {/* Visual Desktop App Preview Mockup */}
        <div className="max-w-3xl mx-auto glass rounded-2xl overflow-hidden text-left shadow-2xl mb-12">
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b text-xs"
            style={{
              background: "rgba(10,11,14,0.85)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <span style={{ color: "var(--text-muted)" }} className="font-mono text-[11px]">
              FZR Rekordbox Exporter — Peak Time Techno.xml
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(29,185,84,0.16)", color: "var(--spotify-green)" }}
            >
              100% Local
            </span>
          </div>

          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Step 1: Rekordbox */}
            <div
              className="rounded-xl p-3.5 border"
              style={{
                background: "rgba(0,91,255,0.06)",
                borderColor: "rgba(0,91,255,0.22)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--rekordbox-blue)" }}>
                  1. Rekordbox Input
                </span>
                <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  XML / M3U8 / TXT
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]" style={{ color: "var(--text-primary)" }}>
                <div className="truncate">Energy Flash (Ext. Mix)</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  132 BPM · 8A · 4 Hot Cues
                </div>
                <div className="truncate pt-1 border-t border-white/5">Strings of Life (Remix)</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  128 BPM · 1A · 2 Loops
                </div>
              </div>
            </div>

            {/* Step 2: Traktor NML */}
            <div
              className="rounded-xl p-3.5 border"
              style={{
                background: "rgba(232,234,240,0.04)",
                borderColor: "rgba(232,234,240,0.16)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--traktor-white)" }}>
                  2. Traktor Pro NML
                </span>
                <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  .nml + .m3u8
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                <div className="text-white/90">&lt;NML VERSION=&quot;19&quot;&gt;</div>
                <div className="truncate">DIR=&quot;/:Music/:Techno/:&quot;</div>
                <div>&lt;MUSICAL_KEY VALUE=&quot;21&quot;/&gt;</div>
                <div>&lt;CUE_V2 TYPE=&quot;0&quot; HOTCUE=&quot;0&quot;/&gt;</div>
              </div>
            </div>

            {/* Step 3: Spotify Review */}
            <div
              className="rounded-xl p-3.5 border"
              style={{
                background: "rgba(29,185,84,0.06)",
                borderColor: "rgba(29,185,84,0.22)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--spotify-green)" }}>
                  3. Spotify Review
                </span>
                <span className="font-mono text-[10px]" style={{ color: "var(--spotify-green)" }}>
                  PKCE OAuth
                </span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2 text-white">Energy Flash</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                    97%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2 text-white">Strings of Life</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    78% ?
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2 text-white/60">Private Bootleg</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold text-[10px]">
                    CSV Log
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tri-brand logos strip */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 opacity-45">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--rekordbox-blue)" }}>
            Rekordbox
          </span>
          <span className="w-px h-4 bg-current opacity-30" />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--traktor-white)" }}>
            Traktor Pro
          </span>
          <span className="w-px h-4 bg-current opacity-30" />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--spotify-green)" }}>
            Spotify
          </span>
        </div>
      </div>

      {/* Waveform bottom decoration */}
      <div className="absolute bottom-6 left-0 right-0 flex items-end justify-center gap-0.5 h-10 overflow-hidden opacity-20 pointer-events-none" aria-hidden>
        {Array.from({ length: 60 }).map((_, i) => {
          const h = 16 + Math.sin(i * 0.4) * 13 + Math.sin(i * 0.13) * 10;
          const hue = i < 20 ? "var(--rekordbox-blue)" : i < 40 ? "var(--traktor-white)" : "var(--spotify-green)";
          return (
            <div
              key={i}
              className="w-1 rounded-full flex-shrink-0"
              style={{ height: `${h}px`, background: hue }}
            />
          );
        })}
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

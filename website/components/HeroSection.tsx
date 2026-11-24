"use client";
import Link from "next/link";
import { useLocale } from "./LocaleContext";
import { GITHUB_REPO, useLatestRelease } from "./useLatestRelease";
import { FzrLogoMark } from "./BrandIcons";

export default function HeroSection() {
  const { locale } = useLocale();
  const release = useLatestRelease();

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden grid-bg"
    >
      {/* Tri-Brand Studio Booth Lighting */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 55% 45% at 15% 22%, rgba(0,149,255,0.16) 0%, transparent 68%),
            radial-gradient(ellipse 45% 40% at 52% 18%, rgba(255,122,26,0.08) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 85% 65%, rgba(29,185,84,0.14) 0%, transparent 68%)
          `,
        }}
      />

      {/* Ambient Jog-Wheel Rings */}
      <div
        className="pointer-events-none absolute top-24 right-[-90px] sm:right-[-40px] w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-15 animate-float"
        aria-hidden
        style={{
          border: "1.5px solid var(--rekordbox-blue)",
          boxShadow: "0 0 70px var(--glow-blue), inset 0 0 40px rgba(0,149,255,0.12)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-16 left-[-70px] sm:left-[-30px] w-56 h-56 sm:w-72 sm:h-72 rounded-full opacity-15 animate-float"
        aria-hidden
        style={{
          border: "1.5px solid var(--spotify-green)",
          boxShadow: "0 0 70px var(--glow-green), inset 0 0 40px rgba(29,185,84,0.12)",
          animationDelay: "2s",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5 pt-28 pb-20 w-full">
        {/* Top Studio Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono font-medium mb-7 glass">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "var(--spotify-green)", boxShadow: "0 0 8px var(--spotify-green)" }}
          />
          <span style={{ color: "var(--text-muted)" }}>
            {locale === "es"
              ? `Open Source · Windows 10/11 + Web Deck · ${release.tagName}`
              : `Open Source · Windows 10/11 + Web Deck · ${release.tagName}`}
          </span>
        </div>

        {/* Display Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.03] mb-6 tracking-tight font-display">
          <span className="gradient-text">
            {locale === "es" ? "Un puente pro" : "One pro bridge"}
          </span>
          <br />
          <span style={{ color: "var(--text-primary)" }}>
            Rekordbox ⇄ Traktor
          </span>
          <br />
          <span style={{ color: "var(--text-primary)", opacity: 0.72 }}>
            {locale === "es" ? "y directo a Spotify" : "& straight to Spotify"}
          </span>
        </h1>

        <p
          className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {locale === "es" ? (
            <>
              Convierte librerías y playlists entre{" "}
              <span style={{ color: "#5ec0ff", fontWeight: 600 }}>Rekordbox</span>,{" "}
              <span style={{ color: "#ffab5e", fontWeight: 600 }}>Traktor Pro</span> y{" "}
              <span style={{ color: "#3ee87b", fontWeight: 600 }}>Spotify</span> conservando Hot
              Cues, Loops, Open Key ↔ Camelot y curvas BPM. 100% local y sin suscripciones.
            </>
          ) : (
            <>
              Convert DJ libraries &amp; playlists across{" "}
              <span style={{ color: "#5ec0ff", fontWeight: 600 }}>Rekordbox</span>,{" "}
              <span style={{ color: "#ffab5e", fontWeight: 600 }}>Traktor Pro</span> &amp;{" "}
              <span style={{ color: "#3ee87b", fontWeight: 600 }}>Spotify</span> while preserving
              Hot Cues, Loops, Open Key ↔ Camelot &amp; BPM curves. 100% local, zero subscriptions.
            </>
          )}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
          <Link
            href="#download"
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm sm:text-base transition-all duration-200 animate-pulse-glow hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #22d962 0%, #1db954 100%)",
              color: "#021107",
            }}
          >
            <DownloadIcon />
            {locale === "es" ? "Descargar para Windows" : "Download for Windows"}
          </Link>
          <Link
            href="#online-tool"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "rgba(0,149,255,0.16)",
              border: "1px solid rgba(0,149,255,0.45)",
              color: "#8cd0ff",
              boxShadow: "0 6px 24px rgba(0,149,255,0.16)",
            }}
          >
            {locale === "es" ? "Abrir Web Deck Online" : "Open Online Web Deck"} →
          </Link>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm glass hover:border-white/25 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ color: "var(--text-muted)" }}
          >
            <GitHubIcon />
            GitHub
          </a>
        </div>

        {/* Pro DJ Dual-Deck Studio Signal Console */}
        <div className="max-w-4xl mx-auto deck-console rounded-3xl overflow-hidden text-left mb-12">
          {/* Console Top Bezel */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b text-xs"
            style={{
              background: "rgba(7,9,14,0.92)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <FzrLogoMark size={22} />
              <span className="font-mono font-bold text-[11px] tracking-wider text-white">
                FZR BOOTH OS
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60">
                Berlin_Peak_Time.xml
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="inline-flex items-center gap-1.5 text-[#5ec0ff]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0095ff]" />
                138.0 BPM
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#ffab5e]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a1a]" />
                CAMELOT 94%
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                ● SYNC READY
              </span>
            </div>
          </div>

          {/* Full-Width 3-Band RGB DJ Waveform Strip */}
          <div
            className="relative px-5 py-3.5 border-b flex items-center justify-between gap-0.5 overflow-hidden"
            style={{
              background: "rgba(4,6,10,0.85)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
            aria-hidden
          >
            {/* Playhead center needle */}
            <div
              className="absolute top-0 bottom-0 left-1/2 w-[2px] z-10"
              style={{
                background: "linear-gradient(180deg, #ff7a1a, #ffffff, #ff7a1a)",
                boxShadow: "0 0 12px #ff7a1a",
              }}
            />
            {Array.from({ length: 64 }).map((_, i) => {
              const t = i / 63;
              const h = 10 + Math.abs(Math.sin(i * 0.48 + 0.3)) * 22 + Math.abs(Math.cos(i * 0.19)) * 10;
              const color =
                t < 0.34
                  ? "#0095ff"
                  : t < 0.48
                    ? "#7fd3ff"
                    : t < 0.54
                      ? "#e8edf7"
                      : t < 0.7
                        ? "#ff7a1a"
                        : "#1db954";
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full animate-eq"
                  style={{
                    height: `${Math.round(h)}px`,
                    background: color,
                    animationDelay: `${(i % 12) * 0.14}s`,
                  }}
                />
              );
            })}
          </div>

          {/* 3 Platform Deck Bays */}
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Deck A: Rekordbox */}
            <div
              className="rounded-2xl p-4 border relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(0,149,255,0.09) 0%, rgba(10,13,21,0.85) 100%)",
                borderColor: "rgba(0,149,255,0.28)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-[#5ec0ff]">
                  DECK A · REKORDBOX
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#0095ff]/15 text-[#7ccdff]">
                  XML / TXT
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white truncate pr-2">Amelie Lens — Feel It</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/35">
                    8A
                  </span>
                </div>
                <div className="font-mono text-[10px] text-white/50">
                  136 BPM · 4 Hot Cues · 1 Loop
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="font-semibold text-white/85 truncate pr-2">Dax J — Propaganda</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/35">
                    9A
                  </span>
                </div>
              </div>
            </div>

            {/* Deck B: Traktor NML v19 */}
            <div
              className="rounded-2xl p-4 border relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(255,122,26,0.09) 0%, rgba(10,13,21,0.85) 100%)",
                borderColor: "rgba(255,122,26,0.28)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-[#ffab5e]">
                  DECK B · TRAKTOR NML
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#ff7a1a]/15 text-[#ffba7a]">
                  NML v19
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[10.5px] text-white/65">
                <div className="text-white">&lt;NML VERSION=&quot;19&quot;&gt;</div>
                <div className="truncate text-[#7ccdff]">DIR=&quot;/:Music/:Techno/:&quot;</div>
                <div>&lt;MUSICAL_KEY VALUE=&quot;21&quot;/&gt;</div>
                <div className="text-[#ffab5e]">&lt;CUE_V2 TYPE=&quot;0&quot; HOTCUE=&quot;0&quot;/&gt;</div>
              </div>
            </div>

            {/* Deck C: Spotify Streaming */}
            <div
              className="rounded-2xl p-4 border relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(29,185,84,0.1) 0%, rgba(10,13,21,0.85) 100%)",
                borderColor: "rgba(29,185,84,0.3)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-[#46ee82]">
                  OUT · SPOTIFY PKCE
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                  FUZZY AI
                </span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2 text-white font-medium">Feel It (Original)</span>
                  <span className="font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    97%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2 text-white font-medium">Doppler (Ext.)</span>
                  <span className="font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    79% ?
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2 text-white/55">Promo Bootleg</span>
                  <span className="font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-bold text-[10px]">
                    CSV Log
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tri-brand precision strip */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 opacity-60 font-mono">
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#5ec0ff]">
            Rekordbox
          </span>
          <span className="w-px h-3.5 bg-white/25" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#ffab5e]">
            Traktor Pro
          </span>
          <span className="w-px h-3.5 bg-white/25" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#46ee82]">
            Spotify
          </span>
        </div>
      </div>
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.37.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.06 1.82 2.79 1.29 3.47.99.1-.77.41-1.29.75-1.59-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 016 0c2.28-1.55 3.28-1.23 3.28-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57C20.57 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
    </svg>
  );
}

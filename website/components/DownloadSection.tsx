"use client";
import { useLocale } from "./LocaleContext";
import { GITHUB_REPO, useLatestRelease } from "./useLatestRelease";
import { FzrLogoMark } from "./BrandIcons";

export default function DownloadSection() {
  const { locale } = useLocale();
  const release = useLatestRelease();

  const requirements =
    locale === "es"
      ? [
          "Windows 10 / 11 (64-bit)",
          "4 GB RAM (8 GB recomendados)",
          "200 MB de espacio libre",
          "Asistente NSIS personalizado (.exe) o portable (.zip)",
        ]
      : [
          "Windows 10 / 11 (64-bit)",
          "4 GB RAM (8 GB recommended)",
          "200 MB free disk space",
          "Custom NSIS wizard (.exe) or portable (.zip)",
        ];

  const installSteps =
    locale === "es"
      ? [
          "Descarga el instalador .exe (o el .zip portable)",
          "Ejecuta el asistente FZR Setup Wizard",
          "Elige tu carpeta de instalación y acceso directo",
          "Abre FZR y arrastra tu primera librería DJ",
        ]
      : [
          "Download the .exe installer (or portable .zip)",
          "Run the custom FZR Setup Wizard",
          "Choose install directory & desktop shortcut",
          "Launch FZR and drop your first DJ library",
        ];

  return (
    <section
      id="download"
      className="py-24 relative overflow-hidden"
      style={{ background: "var(--bg-elevated)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-px tri-divider opacity-40" />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 25% 50%, rgba(0,149,255,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 60% 50% at 75% 50%, rgba(29,185,84,0.09) 0%, transparent 70%)
          `,
        }}
      />

      <div className="max-w-5xl mx-auto px-5 relative z-10">
        <div className="text-center mb-12">
          <p
            className="text-xs font-mono font-bold tracking-widest uppercase mb-3"
            style={{ color: "var(--spotify-green)" }}
          >
            {locale === "es" ? "App de Escritorio Windows" : "Windows Desktop App"}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight font-display">
            {locale === "es" ? "Descarga FZR Rekordbox Exporter" : "Get FZR Rekordbox Exporter"}
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            {locale === "es"
              ? "Desbloquea Spotify OAuth PKCE con revisión manual, relocalizador de archivos en disco, copia portable de audio e historial de cabina."
              : "Unlock direct Spotify OAuth PKCE with manual review, disk auto-relocator, portable USB audio copy & persistent booth history."}
          </p>
        </div>

        {/* Main download console card */}
        <div
          className="deck-console rounded-3xl p-7 sm:p-9 mb-8 relative overflow-hidden"
          style={{ borderColor: "rgba(29,185,84,0.28)" }}
        >
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Real Custom App Icon + Installer Preview */}
            <div className="flex items-center gap-5 flex-shrink-0">
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1.5 flex items-center justify-center relative"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0,149,255,0.35), rgba(255,122,26,0.22), rgba(29,185,84,0.35))",
                  boxShadow: "0 0 50px rgba(0,149,255,0.2), 0 0 50px rgba(29,185,84,0.18)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/app-icon.png"
                  alt="FZR Rekordbox Exporter App Icon"
                  className="w-full h-full rounded-[20px] object-cover"
                />
              </div>
            </div>

            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold mb-3 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {locale === "es" ? "INSTALADOR WINDOWS PERSONALIZADO" : "CUSTOM WINDOWS INSTALLER"}
              </div>
              <h3 className="text-2xl font-black mb-1 font-display" style={{ color: "var(--text-primary)" }}>
                FZR Rekordbox Exporter
              </h3>
              <p className="text-sm font-mono mb-5" style={{ color: "var(--text-muted)" }}>
                {locale === "es" ? "Versión" : "Version"} {release.version} · Windows x64
                {release.exeSizeMb ? ` · ${release.exeSizeMb}` : ""} · MIT Open Source
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
                <a
                  href={release.exeUrl}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse-glow"
                  style={{
                    background: "linear-gradient(135deg, #22d962 0%, #1db954 100%)",
                    color: "#021107",
                  }}
                >
                  <DownloadIcon />
                  {locale === "es" ? "Descargar Instalador (.exe)" : "Download Installer (.exe)"}
                </a>

                {release.zipUrl && (
                  <a
                    href={release.zipUrl}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm glass hover:border-white/25 transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {locale === "es" ? "Portable (.zip)" : "Portable (.zip)"}
                    {release.zipSizeMb ? ` · ${release.zipSizeMb}` : ""}
                  </a>
                )}

                <a
                  href={release.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm glass hover:border-white/20 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ color: "var(--text-muted)" }}
                >
                  <GitHubIcon />
                  {locale === "es" ? "Releases en GitHub" : "GitHub Releases"}
                </a>
              </div>
            </div>

            {/* Mini Installer Wizard Visual Badge */}
            <div
              className="hidden xl:flex flex-col w-48 rounded-2xl overflow-hidden border flex-shrink-0"
              style={{ borderColor: "rgba(255,255,255,0.12)", background: "#080b12" }}
            >
              <div className="px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.07] flex items-center gap-1.5 text-[9px] font-mono text-white/60">
                <FzrLogoMark size={13} />
                FZR Setup.exe
              </div>
              <div className="p-3 flex gap-2.5 items-center">
                <div
                  className="w-11 h-20 rounded-lg flex flex-col items-center justify-between py-2 px-1 border border-white/10"
                  style={{
                    background: "linear-gradient(180deg, rgba(0,149,255,0.25), rgba(10,13,21,0.95), rgba(29,185,84,0.25))",
                  }}
                >
                  <FzrLogoMark size={20} />
                  <div className="flex flex-col gap-1 w-full">
                    <span className="h-1 rounded-full bg-[#0095ff]" />
                    <span className="h-1 rounded-full bg-[#ff7a1a]" />
                    <span className="h-1 rounded-full bg-[#1db954]" />
                  </div>
                </div>
                <div className="flex-1 text-left space-y-1.5">
                  <div className="text-[10px] font-bold text-white">NSIS Wizard</div>
                  <div className="text-[9px] text-white/50 leading-tight">
                    Custom dark sidebar, desktop shortcut &amp; fast install
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[8px] font-bold">
                    NEXT ›
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements + How to install */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="glass rounded-2xl p-6" style={{ borderTop: "2px solid rgba(0,149,255,0.5)" }}>
            <h4
              className="text-xs font-mono font-bold tracking-widest uppercase mb-4"
              style={{ color: "var(--rekordbox-blue)" }}
            >
              {locale === "es" ? "Requisitos del sistema" : "System Requirements"}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {requirements.map((req) => (
                <li key={req} className="flex items-start gap-2.5 text-sm">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                    style={{ background: "var(--rekordbox-blue)", boxShadow: "0 0 8px var(--rekordbox-blue)" }}
                  />
                  <span style={{ color: "var(--text-muted)" }}>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-6" style={{ borderTop: "2px solid rgba(255,122,26,0.5)" }}>
            <h4
              className="text-xs font-mono font-bold tracking-widest uppercase mb-4"
              style={{ color: "#ffab5e" }}
            >
              {locale === "es" ? "Cómo instalar" : "How to Install"}
            </h4>
            <ol className="flex flex-col gap-2.5">
              {installSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0"
                    style={{
                      background: "rgba(255,122,26,0.16)",
                      border: "1px solid rgba(255,122,26,0.35)",
                      color: "#ffab5e",
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

        <p className="text-center text-xs mt-8" style={{ color: "var(--text-subtle)" }}>
          {locale === "es" ? (
            <>
              Windows puede mostrar un aviso de SmartScreen en apps open source sin firma comercial.
              Haz clic en &quot;Más información&quot; → &quot;Ejecutar de todas formas&quot;. Código
              disponible en{" "}
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white transition-colors"
              >
                GitHub (licencia MIT)
              </a>
              .
            </>
          ) : (
            <>
              Windows may show a SmartScreen warning for unsigned open-source apps. Click &quot;More
              info&quot; → &quot;Run anyway&quot;. The source code is{" "}
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white transition-colors"
              >
                fully open source on GitHub
              </a>
              .
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

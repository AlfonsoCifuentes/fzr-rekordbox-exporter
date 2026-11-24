"use client";

import React, { useState, useMemo } from "react";
import { useLocale } from "./LocaleContext";
import { FzrLogoMark, getCamelotBadgeStyle } from "./BrandIcons";
import CamelotWheelSvg from "./CamelotWheelSvg";
import {
  type WebParseOutput,
  type WebPlaylist,
  DEMO_SET,
  parseUploadedDjFile,
  analyzeWebPlaylist,
  sortWebPlaylistHarmonically,
  deduplicateWebPlaylist,
  cleanWebPlaylistMetadata,
  fixWebHalfDoubleBpm,
  toCamelot,
  exportWebM3u8,
  exportWebNml,
  exportWebRekordboxXml,
  exportWebSetlistTxt,
  exportWebStreamingCsv,
  exportWebCueSheet,
  exportWebHtmlPrepSheet,
  remapWebPlaylistPaths,
  splitWebPlaylistByBpm,
} from "@/lib/djConverter";

function triggerDownload(content: string, fileName: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function OnlineConverterSection() {
  const { locale } = useLocale();
  const [data, setData] = useState<WebParseOutput | null>(null);
  const [activePlIdx, setActivePlIdx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemap, setShowRemap] = useState(false);
  const [remapFrom, setRemapFrom] = useState("");
  const [remapTo, setRemapTo] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const activePlaylist: WebPlaylist | null = data?.playlists[activePlIdx] ?? data?.playlists[0] ?? null;
  const analytics = useMemo(
    () => (activePlaylist ? analyzeWebPlaylist(activePlaylist) : null),
    [activePlaylist]
  );

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const parsed = await parseUploadedDjFile(file);
      if (parsed.playlists.length === 0) {
        setError(
          locale === "es"
            ? "No se encontraron playlists dentro del archivo."
            : "No playlists were found inside this file."
        );
        return;
      }
      setData(parsed);
      setActivePlIdx(0);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const updateActivePlaylist = (updated: WebPlaylist) => {
    if (!data) return;
    setData({
      ...data,
      playlists: data.playlists.map((p, i) => (i === activePlIdx ? updated : p)),
    });
  };

  const safeName = (activePlaylist?.name ?? "playlist").replace(/[<>:"/\\|?*]/g, "_");

  return (
    <section
      id="online-tool"
      className="py-24 relative overflow-hidden grid-bg"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "var(--spotify-green)" }}
          >
            {locale === "es" ? "Herramienta Web Instantánea" : "Instant Browser Tool"}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight">
            {locale === "es" ? (
              <>
                Pruébalo <span className="gradient-text">ahora mismo</span> en tu navegador
              </>
            ) : (
              <>
                Try it <span className="gradient-text">right now</span> in your browser
              </>
            )}
          </h2>
          <p className="text-base max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            {locale === "es"
              ? "Analiza compatibilidad armónica Camelot, detecta duplicados y convierte entre Rekordbox XML, Traktor NML, M3U8, Setlist y CSV al instante. 100% client-side: tus archivos nunca se suben a ningún servidor."
              : "Analyze Camelot harmonic flow, detect duplicates, and convert between Rekordbox XML, Traktor NML, M3U8, DJ Setlists & Streaming CSV instantly. 100% client-side — your files never leave your browser."}
          </p>
        </div>

        {/* Dropzone or Active Workspace */}
        {!data ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="glass rounded-3xl p-10 text-center max-w-3xl mx-auto transition-all"
            style={{
              border: dragging
                ? "2px dashed var(--spotify-green)"
                : "2px dashed rgba(255,255,255,0.14)",
              background: dragging ? "rgba(29,185,84,0.08)" : "rgba(22,25,33,0.7)",
            }}
          >
            <div className="mx-auto mb-5 w-16 h-16 flex items-center justify-center">
              <FzrLogoMark size={64} />
            </div>
            <h3 className="text-lg font-bold mb-2 font-display" style={{ color: "var(--text-primary)" }}>
              {locale === "es"
                ? "Arrastra aquí un archivo .xml, .nml, .crate, .m3u8, .txt o .csv"
                : "Drop a Rekordbox .xml, Traktor .nml, Serato .crate, VirtualDJ, .m3u8, .txt or .csv file"}
            </h3>
            <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
              {locale === "es"
                ? "Procesamiento 100% local en JavaScript · Cero subida a la nube"
                : "100% local in-browser processing · Zero cloud upload"}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label
                className="px-6 py-2.5 rounded-full font-bold text-sm cursor-pointer transition-transform hover:scale-105"
                style={{ background: "var(--spotify-green)", color: "#000" }}
              >
                {locale === "es" ? "Seleccionar archivo" : "Choose file"}
                <input
                  type="file"
                  accept=".xml,.nml,.crate,.vdjfolder,.m3u8,.m3u,.txt,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setData(structuredClone(DEMO_SET));
                  setActivePlIdx(0);
                }}
                className="px-5 py-2.5 rounded-full font-semibold text-sm glass hover:border-white/25 transition-transform hover:scale-105 cursor-pointer"
                style={{ color: "var(--text-primary)" }}
              >
                ✨ {locale === "es" ? "Cargar set Techno de prueba" : "Load Demo Techno Set"}
              </button>
            </div>

            {error && (
              <p className="mt-5 text-xs text-red-400 font-medium">⚠️ {error}</p>
            )}
          </div>
        ) : (
          <div className="glass rounded-3xl overflow-hidden max-w-5xl mx-auto">
            {/* Top bar */}
            <div
              className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(10,11,14,0.6)" }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(0,91,255,0.18)", color: "#6ba4ff" }}
                >
                  {data.format}
                </span>
                {data.playlists.length > 1 ? (
                  <select
                    value={activePlIdx}
                    onChange={(e) => setActivePlIdx(Number(e.target.value))}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-[#161921] border border-white/10 text-white"
                  >
                    {data.playlists.map((p, i) => (
                      <option key={p.id} value={i}>
                        {p.name} ({p.tracks.length})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold text-sm text-white">{activePlaylist?.name}</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {activePlaylist && (
                  <>
                    <button
                      type="button"
                      onClick={() => updateActivePlaylist(sortWebPlaylistHarmonically(activePlaylist))}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all hover:brightness-110"
                      style={{ background: "rgba(29,185,84,0.18)", color: "#3ae374", border: "1px solid rgba(29,185,84,0.35)" }}
                    >
                      ✨ {locale === "es" ? "Auto-ordenar Camelot" : "Harmonic Auto-Sort"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = cleanWebPlaylistMetadata(activePlaylist);
                        updateActivePlaylist(res.playlist);
                        setNotice(
                          locale === "es"
                            ? `${res.cleaned} pista(s) limpiadas y claves normalizadas a Camelot.`
                            : `${res.cleaned} track(s) cleaned & keys normalized to Camelot.`
                        );
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold glass text-[#7ccdff] hover:border-white/25 cursor-pointer"
                    >
                      🧼 {locale === "es" ? "Limpiar tags" : "Clean Tags"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = fixWebHalfDoubleBpm(activePlaylist);
                        updateActivePlaylist(res.playlist);
                        setNotice(
                          locale === "es"
                            ? `${res.fixed} pista(s) corregidas (BPM ×2/÷2).`
                            : `${res.fixed} track(s) fixed (half/double BPM).`
                        );
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold glass text-white/90 hover:border-white/25 cursor-pointer"
                    >
                      ⚡ BPM ×2/÷2
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const zones = splitWebPlaylistByBpm(activePlaylist);
                        if (zones.length <= 1) {
                          setNotice(locale === "es" ? "No hay suficiente rango BPM para dividir en zonas." : "Not enough BPM spread to split into zones.");
                          return;
                        }
                        setData({ ...data, playlists: [...zones, ...data.playlists] });
                        setActivePlIdx(0);
                        setNotice(locale === "es" ? `Dividida en ${zones.length} zonas BPM.` : `Split into ${zones.length} BPM zones.`);
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold glass text-white/90 hover:border-white/25 cursor-pointer"
                    >
                      ✂️ {locale === "es" ? "Zonas BPM" : "Split BPM"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRemap((v) => !v)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold glass text-white/90 hover:border-white/25 cursor-pointer"
                    >
                      🔧 {locale === "es" ? "Rutas" : "Remap Paths"}
                    </button>
                    {analytics && analytics.duplicateCount > 0 && (
                      <button
                        type="button"
                        onClick={() => updateActivePlaylist(deduplicateWebPlaylist(activePlaylist))}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer"
                        style={{ background: "rgba(245,166,35,0.18)", color: "#f5b942", border: "1px solid rgba(245,166,35,0.35)" }}
                      >
                        🧹 {locale === "es" ? `Quitar ${analytics.duplicateCount} duplicado(s)` : `Remove ${analytics.duplicateCount} duplicate(s)`}
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setData(null)}
                  className="px-3 py-1.5 rounded-full text-xs glass text-white/70 hover:text-white cursor-pointer"
                >
                  {locale === "es" ? "Cambiar archivo" : "Reset"}
                </button>
              </div>
            </div>

            {/* Optional Path Remapper Bar */}
            {showRemap && activePlaylist && (
              <div
                className="px-6 py-3 flex flex-wrap items-center gap-2 border-b text-xs"
                style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,91,255,0.06)" }}
              >
                <input
                  type="text"
                  value={remapFrom}
                  onChange={(e) => setRemapFrom(e.target.value)}
                  placeholder={locale === "es" ? "Prefijo antiguo (ej: C:/Music)" : "Old prefix (e.g. C:/Music)"}
                  className="flex-1 min-w-[150px] rounded-lg px-3 py-1.5 bg-[#0f1219] border border-white/15 text-white font-mono"
                />
                <span className="text-white/50">→</span>
                <input
                  type="text"
                  value={remapTo}
                  onChange={(e) => setRemapTo(e.target.value)}
                  placeholder={locale === "es" ? "Prefijo nuevo (ej: D:/DJ)" : "New prefix (e.g. D:/DJ)"}
                  className="flex-1 min-w-[150px] rounded-lg px-3 py-1.5 bg-[#0f1219] border border-white/15 text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const res = remapWebPlaylistPaths(activePlaylist, remapFrom, remapTo);
                    updateActivePlaylist(res.playlist);
                    setNotice(
                      locale === "es"
                        ? `${res.count} ruta(s) remapeada(s).`
                        : `${res.count} track path(s) remapped.`
                    );
                  }}
                  className="px-4 py-1.5 rounded-full font-bold cursor-pointer"
                  style={{ background: "var(--rekordbox-blue)", color: "#fff" }}
                >
                  {locale === "es" ? "Aplicar" : "Apply"}
                </button>
              </div>
            )}

            {notice && (
              <div className="px-6 py-2 text-xs text-emerald-300 bg-emerald-500/10 border-b border-emerald-500/20 flex justify-between items-center">
                <span>✓ {notice}</span>
                <button type="button" onClick={() => setNotice(null)} className="text-white/60 hover:text-white cursor-pointer">✕</button>
              </div>
            )}

            {/* KPI Analytics Strip */}
            {analytics && (
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="rounded-xl p-3.5 bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {locale === "es" ? "Pistas / Duración" : "Tracks / Duration"}
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {analytics.totalTracks} · {fmtTime(analytics.totalDurationSeconds)}
                  </div>
                </div>

                <div className="rounded-xl p-3.5 bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {locale === "es" ? "Rango BPM" : "BPM Range"}
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {analytics.bpmMin !== undefined ? `${analytics.bpmMin}–${analytics.bpmMax}` : "—"}
                  </div>
                </div>

                <div className="rounded-xl p-3.5 bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {locale === "es" ? "Flujo Armónico Camelot" : "Camelot Harmonic Flow"}
                  </div>
                  <div
                    className="text-lg font-black mt-0.5"
                    style={{
                      color:
                        analytics.harmonicScore === null
                          ? "var(--text-muted)"
                          : analytics.harmonicScore >= 75
                            ? "var(--spotify-green)"
                            : "#f5b942",
                    }}
                  >
                    {analytics.harmonicScore !== null ? `${analytics.harmonicScore}%` : "—"}
                  </div>
                </div>

                <div className="rounded-xl p-3.5 bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {locale === "es" ? "Cues / Duplicados" : "Cues / Duplicates"}
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {analytics.totalCues} /{" "}
                    <span style={{ color: analytics.duplicateCount > 0 ? "#f5b942" : "var(--spotify-green)" }}>
                      {analytics.duplicateCount}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Visual BPM Curve + Interactive Camelot Wheel */}
            {activePlaylist && analytics && (() => {
              const pts = activePlaylist.tracks
                .map((t) => t.bpm)
                .filter((b): b is number => Boolean(b && b > 0));
              if (pts.length < 2 && analytics.topKeys.length === 0) return null;
              const minB = pts.length >= 2 ? Math.min(...pts) : 0;
              const maxB = pts.length >= 2 ? Math.max(...pts) : 0;
              const span = Math.max(4, maxB - minB);
              const W = 520;
              const H = 86;
              const coords = pts.map((b, i) => {
                const x = 10 + (i / Math.max(1, pts.length - 1)) * (W - 20);
                const y = H - 12 - ((b - minB) / span) * (H - 24);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              });
              const area = `10,${H - 12} ${coords.join(" ")} ${W - 10},${H - 12}`;
              return (
                <div
                  className="px-6 py-4 border-b flex flex-col md:flex-row items-center gap-6"
                  style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
                >
                  {pts.length >= 2 && (
                    <div className="flex-1 w-full">
                      <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "var(--text-muted)" }}>
                        <span>{locale === "es" ? "Curva de energía / BPM del set" : "Set Energy / BPM Curve"}</span>
                        <span className="font-mono">{Math.round(minB)} → {Math.round(maxB)} BPM</span>
                      </div>
                      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 block">
                        <defs>
                          <linearGradient id="webBpmGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1db954" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#1db954" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <polygon points={area} fill="url(#webBpmGrad)" />
                        <polyline
                          fill="none"
                          stroke="#1db954"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={coords.join(" ")}
                        />
                      </svg>
                    </div>
                  )}
                  {analytics.topKeys.length > 0 && (
                    <CamelotWheelSvg keys={analytics.topKeys} size={146} />
                  )}
                </div>
              );
            })()}

            {/* Track list table */}
            {activePlaylist && analytics && (
              <div className="max-h-72 overflow-y-auto px-5 py-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10" style={{ color: "var(--text-muted)" }}>
                      <th className="py-2 pr-3 w-8">#</th>
                      <th className="py-2 pr-3">{locale === "es" ? "Artista" : "Artist"}</th>
                      <th className="py-2 pr-3">{locale === "es" ? "Título" : "Title"}</th>
                      <th className="py-2 pr-3 w-16">BPM</th>
                      <th className="py-2 pr-3 w-16">Key</th>
                      <th className="py-2 w-24 text-right">{locale === "es" ? "Transición" : "Flow"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePlaylist.tracks.slice(0, 50).map((t, idx) => {
                      const tr = idx > 0 ? analytics.transitions[idx - 1] : null;
                      const cam = toCamelot(t.key) ?? t.key ?? "—";
                      return (
                        <tr key={`${t.id}-${idx}`} className="border-b border-white/[0.04]">
                          <td className="py-2 pr-3 font-mono text-white/40">{idx + 1}</td>
                          <td className="py-2 pr-3 text-white/80 font-medium">{t.artist}</td>
                          <td className="py-2 pr-3 text-white font-semibold">{t.name}</td>
                          <td className="py-2 pr-3 font-mono text-white/70">
                            {t.bpm ? Math.round(t.bpm) : "—"}
                          </td>
                          <td className="py-2 pr-3 font-mono">
                            {cam !== "—" ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={getCamelotBadgeStyle(cam)}
                              >
                                {cam}
                              </span>
                            ) : (
                              <span className="text-white/30">—</span>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            {tr && tr.rating !== "unknown" ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{
                                  background:
                                    tr.rating === "perfect"
                                      ? "rgba(29,185,84,0.16)"
                                      : tr.rating === "energy"
                                        ? "rgba(245,166,35,0.18)"
                                        : "rgba(231,76,60,0.18)",
                                  color:
                                    tr.rating === "perfect"
                                      ? "#3ae374"
                                      : tr.rating === "energy"
                                        ? "#f5b942"
                                        : "#ff7b6b",
                                }}
                              >
                                {tr.rating === "perfect"
                                  ? "✓ Camelot"
                                  : tr.rating === "energy"
                                    ? "⚡ Boost"
                                    : "⚠ Clash"}
                              </span>
                            ) : (
                              <span className="text-white/25">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {activePlaylist.tracks.length > 50 && (
                  <p className="text-center text-xs py-2" style={{ color: "var(--text-muted)" }}>
                    {locale === "es"
                      ? `Mostrando 50 de ${activePlaylist.tracks.length} tracks (todos se incluirán al exportar)`
                      : `Showing 50 of ${activePlaylist.tracks.length} tracks (all included on export)`}
                  </p>
                )}
              </div>
            )}

            {/* Instant Download Export Bar */}
            {activePlaylist && (
              <div
                className="px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3"
                style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(10,11,14,0.75)" }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  {locale === "es" ? "Descargar conversión:" : "Download converted file:"}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => triggerDownload(exportWebNml(activePlaylist), `${safeName}.nml`, "application/xml")}
                    className="px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-transform hover:scale-105"
                    style={{ background: "var(--traktor-white)", color: "#000" }}
                  >
                    ↓ Traktor .NML
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(exportWebRekordboxXml(activePlaylist), `${safeName}_rekordbox.xml`, "application/xml")}
                    className="px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-transform hover:scale-105"
                    style={{ background: "var(--rekordbox-blue)", color: "#fff" }}
                  >
                    ↓ Rekordbox .XML
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(exportWebM3u8(activePlaylist), `${safeName}.m3u8`)}
                    className="px-4 py-2 rounded-full text-xs font-semibold glass hover:border-white/25 text-white cursor-pointer"
                  >
                    ↓ .M3U8
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(exportWebSetlistTxt(activePlaylist), `${safeName}_setlist.txt`)}
                    className="px-4 py-2 rounded-full text-xs font-semibold glass hover:border-white/25 text-white cursor-pointer"
                  >
                    ↓ DJ Setlist .TXT
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(exportWebCueSheet(activePlaylist), `${safeName}.cue`)}
                    className="px-4 py-2 rounded-full text-xs font-semibold glass hover:border-white/25 text-white cursor-pointer"
                  >
                    ↓ CUE Sheet .CUE
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(exportWebHtmlPrepSheet(activePlaylist), `${safeName}_booth_prep.html`, "text/html;charset=utf-8")}
                    className="px-4 py-2 rounded-full text-xs font-semibold glass hover:border-white/25 text-[#7ccdff] cursor-pointer"
                  >
                    ↓ Booth Prep .HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(exportWebStreamingCsv(activePlaylist), `${safeName}_streaming.csv`, "text/csv;charset=utf-8")}
                    className="px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-transform hover:scale-105"
                    style={{ background: "var(--spotify-green)", color: "#000" }}
                  >
                    ↓ Streaming .CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

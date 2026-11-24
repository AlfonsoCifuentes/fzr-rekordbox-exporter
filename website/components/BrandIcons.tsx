import React from "react";

export function FzrLogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="fzrWebRing" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0095ff" />
          <stop offset="48%" stopColor="#e8edf7" />
          <stop offset="76%" stopColor="#1db954" />
          <stop offset="100%" stopColor="#ff7a1a" />
        </linearGradient>
        <radialGradient id="fzrWebChassis" cx="30%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#162138" />
          <stop offset="65%" stopColor="#0a0e17" />
          <stop offset="100%" stopColor="#06080d" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#fzrWebChassis)" />
      <circle cx="32" cy="32" r="22" stroke="url(#fzrWebRing)" strokeWidth="3.2" />
      <circle cx="32" cy="32" r="15" fill="#0b0e16" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      <rect x="31" y="6" width="2" height="5" rx="1" fill="#ffffff" />
      <rect x="20.5" y="28.5" width="2.6" height="7" rx="1.3" fill="#0095ff" />
      <rect x="24.5" y="25.5" width="2.6" height="13" rx="1.3" fill="#42b7ff" />
      <rect x="28.5" y="22.5" width="2.6" height="19" rx="1.3" fill="#e8edf7" />
      <rect x="32.5" y="24.5" width="2.6" height="15" rx="1.3" fill="#ff7a1a" />
      <rect x="36.5" y="23.5" width="2.6" height="17" rx="1.3" fill="#2ee06e" />
      <rect x="40.5" y="28" width="2.6" height="8" rx="1.3" fill="#1db954" />
    </svg>
  );
}

export function FormatsSvgIcon({ color = "#0095ff" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}

export function TraktorDeckSvgIcon({ color = "#ff7a1a" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3" />
      <path d="M16.2 7.8l2.1-2.1" />
    </svg>
  );
}

export function SpotifySignalSvgIcon({ color = "#1db954" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10.5c2.6-.9 5.8-.7 8.2.5" />
      <path d="M8.8 13.5c2.1-.6 4.6-.5 6.6.4" />
      <path d="M9.6 16.3c1.6-.4 3.4-.3 4.8.3" />
    </svg>
  );
}

export function HarmonicWaveSvgIcon({ color = "#0095ff" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h3l2.5-6 4 12 3-8 2.5 2H22" />
    </svg>
  );
}

export function FolderSyncSvgIcon({ color = "#e8edf7" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

export function ShieldLocalSvgIcon({ color = "#1db954" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

const CAMELOT_WHEEL_COLORS: Record<number, { bg: string; fg: string; border: string }> = {
  1: { bg: "rgba(0, 210, 190, 0.16)", fg: "#4df2df", border: "rgba(0, 210, 190, 0.35)" },
  2: { bg: "rgba(34, 211, 120, 0.16)", fg: "#5cf0a0", border: "rgba(34, 211, 120, 0.35)" },
  3: { bg: "rgba(132, 224, 65, 0.16)", fg: "#a9f26b", border: "rgba(132, 224, 65, 0.35)" },
  4: { bg: "rgba(232, 200, 50, 0.16)", fg: "#f8df6a", border: "rgba(232, 200, 50, 0.35)" },
  5: { bg: "rgba(255, 145, 50, 0.18)", fg: "#ffad66", border: "rgba(255, 145, 50, 0.38)" },
  6: { bg: "rgba(255, 92, 92, 0.18)", fg: "#ff8a8a", border: "rgba(255, 92, 92, 0.38)" },
  7: { bg: "rgba(244, 72, 140, 0.18)", fg: "#ff85b5", border: "rgba(244, 72, 140, 0.38)" },
  8: { bg: "rgba(210, 90, 245, 0.18)", fg: "#df94ff", border: "rgba(210, 90, 245, 0.38)" },
  9: { bg: "rgba(135, 110, 255, 0.18)", fg: "#aea0ff", border: "rgba(135, 110, 255, 0.38)" },
  10: { bg: "rgba(60, 145, 255, 0.18)", fg: "#78b8ff", border: "rgba(60, 145, 255, 0.38)" },
  11: { bg: "rgba(0, 185, 255, 0.18)", fg: "#5cd4ff", border: "rgba(0, 185, 255, 0.38)" },
  12: { bg: "rgba(0, 212, 225, 0.18)", fg: "#5ef0f8", border: "rgba(0, 212, 225, 0.38)" },
};

export function getCamelotBadgeStyle(code: string | undefined): React.CSSProperties {
  if (!code) return {};
  const n = parseInt(code.replace(/[^0-9]/g, ""), 10);
  const c = CAMELOT_WHEEL_COLORS[n];
  if (!c) return {};
  return {
    background: c.bg,
    color: c.fg,
    border: `1px solid ${c.border}`,
  };
}

import React from 'react'

/**
 * Iconic FZR Jog-Wheel + 6-bar RGB DJ Waveform SVG Emblem.
 */
export function FzrEmblem({ size = 32 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="fzrRingDesk" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0095ff" />
          <stop offset="48%" stopColor="#e8edf7" />
          <stop offset="76%" stopColor="#1db954" />
          <stop offset="100%" stopColor="#ff7a1a" />
        </linearGradient>
        <radialGradient id="fzrChassisDesk" cx="30%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#162035" />
          <stop offset="65%" stopColor="#0a0e17" />
          <stop offset="100%" stopColor="#06080d" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#fzrChassisDesk)" />
      <circle cx="32" cy="32" r="22" stroke="url(#fzrRingDesk)" strokeWidth="3.2" />
      <circle cx="32" cy="32" r="15" fill="#0b0e16" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      <rect x="31" y="6" width="2" height="5" rx="1" fill="#ffffff" />
      <rect x="20.5" y="28.5" width="2.6" height="7" rx="1.3" fill="#0095ff" />
      <rect x="24.5" y="25.5" width="2.6" height="13" rx="1.3" fill="#42b7ff" />
      <rect x="28.5" y="22.5" width="2.6" height="19" rx="1.3" fill="#e8edf7" />
      <rect x="32.5" y="24.5" width="2.6" height="15" rx="1.3" fill="#ff7a1a" />
      <rect x="36.5" y="23.5" width="2.6" height="17" rx="1.3" fill="#2ee06e" />
      <rect x="40.5" y="28" width="2.6" height="8" rx="1.3" fill="#1db954" />
    </svg>
  )
}

/**
 * Compact 3-band RGB waveform strip (Rekordbox/Traktor deck aesthetic).
 */
export function MiniRgbWaveform({ bars = 28, height = 22 }: { bars?: number; height?: number }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height }} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const t = i / Math.max(1, bars - 1)
        const hPct = 22 + Math.abs(Math.sin(i * 0.58 + 0.4)) * 78 * (0.45 + 0.55 * Math.sin(t * Math.PI))
        const color =
          t < 0.36
            ? '#0095ff'
            : t < 0.55
              ? '#e8edf7'
              : t < 0.72
                ? '#ff7a1a'
                : '#1db954'
        return (
          <span
            key={i}
            style={{
              width: 3,
              height: `${Math.round(hPct)}%`,
              borderRadius: 99,
              background: color,
              opacity: 0.85
            }}
          />
        )
      })}
    </div>
  )
}

export function DeckIcon({ color = 'currentColor' }: { color?: string }): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3" />
    </svg>
  )
}

export function SpotifyWavesIcon({ color = '#1db954' }: { color?: string }): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10.5c2.6-.9 5.8-.7 8.2.5" />
      <path d="M8.8 13.5c2.1-.6 4.6-.5 6.6.4" />
      <path d="M9.6 16.3c1.6-.4 3.4-.3 4.8.3" />
    </svg>
  )
}

export function FolderTreeIcon({ color = '#0095ff' }: { color?: string }): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M8 13h8" />
      <path d="M8 16h5" />
    </svg>
  )
}

export function WaveformPulseIcon({ color = '#ff7a1a' }: { color?: string }): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h3l2.5-6 4 12 3-8 2.5 2H22" />
    </svg>
  )
}

/**
 * Authentic Rekordbox / Traktor Camelot Wheel color palette for harmonic key badges.
 */
const CAMELOT_COLORS: Record<number, { bg: string; fg: string; border: string }> = {
  1: { bg: 'rgba(0, 210, 190, 0.16)', fg: '#4df2df', border: 'rgba(0, 210, 190, 0.35)' },
  2: { bg: 'rgba(34, 211, 120, 0.16)', fg: '#5cf0a0', border: 'rgba(34, 211, 120, 0.35)' },
  3: { bg: 'rgba(132, 224, 65, 0.16)', fg: '#a9f26b', border: 'rgba(132, 224, 65, 0.35)' },
  4: { bg: 'rgba(232, 200, 50, 0.16)', fg: '#f8df6a', border: 'rgba(232, 200, 50, 0.35)' },
  5: { bg: 'rgba(255, 145, 50, 0.18)', fg: '#ffad66', border: 'rgba(255, 145, 50, 0.38)' },
  6: { bg: 'rgba(255, 92, 92, 0.18)', fg: '#ff8a8a', border: 'rgba(255, 92, 92, 0.38)' },
  7: { bg: 'rgba(244, 72, 140, 0.18)', fg: '#ff85b5', border: 'rgba(244, 72, 140, 0.38)' },
  8: { bg: 'rgba(210, 90, 245, 0.18)', fg: '#df94ff', border: 'rgba(210, 90, 245, 0.38)' },
  9: { bg: 'rgba(135, 110, 255, 0.18)', fg: '#aea0ff', border: 'rgba(135, 110, 255, 0.38)' },
  10: { bg: 'rgba(60, 145, 255, 0.18)', fg: '#78b8ff', border: 'rgba(60, 145, 255, 0.38)' },
  11: { bg: 'rgba(0, 185, 255, 0.18)', fg: '#5cd4ff', border: 'rgba(0, 185, 255, 0.38)' },
  12: { bg: 'rgba(0, 212, 225, 0.18)', fg: '#5ef0f8', border: 'rgba(0, 212, 225, 0.38)' }
}

export function getCamelotPillStyle(camelotCode: string | undefined): React.CSSProperties {
  if (!camelotCode) return {}
  const num = parseInt(camelotCode.replace(/[^0-9]/g, ''), 10)
  const col = CAMELOT_COLORS[num]
  if (!col) return {}
  return {
    background: col.bg,
    color: col.fg,
    border: `1px solid ${col.border}`,
    padding: '1px 7px',
    borderRadius: 99,
    fontFamily: 'monospace',
    fontWeight: 700,
    fontSize: 11
  }
}

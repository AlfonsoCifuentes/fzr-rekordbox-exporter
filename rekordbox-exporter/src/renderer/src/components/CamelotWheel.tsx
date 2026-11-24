import React from 'react'

const SECTOR_HUES = [
  '#00d2be', // 1
  '#22d378', // 2
  '#84e041', // 3
  '#e8c832', // 4
  '#ff9132', // 5
  '#ff5c5c', // 6
  '#f4488c', // 7
  '#d25af5', // 8
  '#876eff', // 9
  '#3c91ff', // 10
  '#00b9ff', // 11
  '#00d4e1'  // 12
]

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function sectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  const [x1, y1] = polarToCartesian(cx, cy, rOuter, startDeg)
  const [x2, y2] = polarToCartesian(cx, cy, rOuter, endDeg)
  const [x3, y3] = polarToCartesian(cx, cy, rInner, endDeg)
  const [x4, y4] = polarToCartesian(cx, cy, rInner, startDeg)
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rOuter} ${rOuter} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${rInner} ${rInner} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`
}

type Props = {
  keyDistribution: Array<{ key: string; count: number }>
  size?: number
}

/**
 * Interactive 12-sector circular Camelot Wheel SVG visualizer.
 * Inner ring = Minor (1A–12A), Outer ring = Major (1B–12B).
 */
export default function CamelotWheel({ keyDistribution, size = 210 }: Props): JSX.Element {
  const counts = new Map(keyDistribution.map((k) => [k.key.toUpperCase(), k.count]))
  const maxCount = Math.max(1, ...keyDistribution.map((k) => k.count))

  const cx = 110
  const cy = 110
  const sectors = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      style={{ display: 'block', margin: '0 auto' }}
      aria-label="Rueda armónica Camelot"
    >
      {sectors.map((num, idx) => {
        const startDeg = idx * 30 - 15
        const endDeg = startDeg + 28.5
        const midDeg = idx * 30
        const hue = SECTOR_HUES[idx]

        const countA = counts.get(`${num}A`) ?? 0
        const countB = counts.get(`${num}B`) ?? 0

        const alphaA = countA > 0 ? 0.28 + 0.65 * (countA / maxCount) : 0.06
        const alphaB = countB > 0 ? 0.28 + 0.65 * (countB / maxCount) : 0.05

        const [lxA, lyA] = polarToCartesian(cx, cy, 56, midDeg)
        const [lxB, lyB] = polarToCartesian(cx, cy, 88, midDeg)

        return (
          <g key={num}>
            {/* Outer ring: Major (B) */}
            <path
              d={sectorPath(cx, cy, 73, 103, startDeg, endDeg)}
              fill={hue}
              fillOpacity={alphaB}
              stroke={countB > 0 ? hue : 'rgba(255,255,255,0.08)'}
              strokeWidth={countB > 0 ? 1.2 : 0.6}
            >
              <title>{`${num}B: ${countB} track(s)`}</title>
            </path>
            <text
              x={lxB}
              y={lyB + 3.5}
              textAnchor="middle"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight={countB > 0 ? '800' : '500'}
              fill={countB > 0 ? '#ffffff' : 'rgba(255,255,255,0.35)'}
              pointerEvents="none"
            >
              {num}B
            </text>

            {/* Inner ring: Minor (A) */}
            <path
              d={sectorPath(cx, cy, 39, 71, startDeg, endDeg)}
              fill={hue}
              fillOpacity={alphaA}
              stroke={countA > 0 ? hue : 'rgba(255,255,255,0.08)'}
              strokeWidth={countA > 0 ? 1.2 : 0.6}
            >
              <title>{`${num}A: ${countA} track(s)`}</title>
            </path>
            <text
              x={lxA}
              y={lyA + 3.5}
              textAnchor="middle"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight={countA > 0 ? '800' : '500'}
              fill={countA > 0 ? '#ffffff' : 'rgba(255,255,255,0.4)'}
              pointerEvents="none"
            >
              {num}A
            </text>
          </g>
        )
      })}

      {/* Center hub */}
      <circle cx={cx} cy={cy} r={34} fill="#0a0d16" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        fontSize="9"
        fontFamily="monospace"
        fontWeight="800"
        fill="#eef2fa"
      >
        CAMELOT
      </text>
      <text
        x={cx}
        y={cy + 11}
        textAnchor="middle"
        fontSize="8"
        fontFamily="monospace"
        fill="#8a94ac"
      >
        {keyDistribution.length} keys
      </text>
    </svg>
  )
}

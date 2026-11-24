"use client";
import React from "react";

const HUES = [
  "#00d2be", "#22d378", "#84e041", "#e8c832",
  "#ff9132", "#ff5c5c", "#f4488c", "#d25af5",
  "#876eff", "#3c91ff", "#00b9ff", "#00d4e1",
];

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function wedge(cx: number, cy: number, ri: number, ro: number, a0: number, a1: number): string {
  const [x1, y1] = polar(cx, cy, ro, a0);
  const [x2, y2] = polar(cx, cy, ro, a1);
  const [x3, y3] = polar(cx, cy, ri, a1);
  const [x4, y4] = polar(cx, cy, ri, a0);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${ro} ${ro} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${ri} ${ri} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;
}

export default function CamelotWheelSvg({
  keys,
  size = 164,
}: {
  keys: Array<{ key: string; count: number }>;
  size?: number;
}) {
  const map = new Map(keys.map((k) => [k.key.toUpperCase(), k.count]));
  const max = Math.max(1, ...keys.map((k) => k.count));
  const cx = 110;
  const cy = 110;

  return (
    <svg width={size} height={size} viewBox="0 0 220 220" className="block flex-shrink-0" aria-label="Camelot Wheel">
      {Array.from({ length: 12 }, (_, idx) => {
        const num = idx + 1;
        const a0 = idx * 30 - 15;
        const a1 = a0 + 28.5;
        const mid = idx * 30;
        const hue = HUES[idx];
        const cA = map.get(`${num}A`) ?? 0;
        const cB = map.get(`${num}B`) ?? 0;
        const [lxA, lyA] = polar(cx, cy, 56, mid);
        const [lxB, lyB] = polar(cx, cy, 88, mid);

        return (
          <g key={num}>
            <path
              d={wedge(cx, cy, 73, 103, a0, a1)}
              fill={hue}
              fillOpacity={cB > 0 ? 0.3 + 0.65 * (cB / max) : 0.05}
              stroke={cB > 0 ? hue : "rgba(255,255,255,0.08)"}
              strokeWidth={cB > 0 ? 1.2 : 0.6}
            >
              <title>{`${num}B: ${cB}`}</title>
            </path>
            <text
              x={lxB}
              y={lyB + 3.5}
              textAnchor="middle"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight={cB > 0 ? "800" : "500"}
              fill={cB > 0 ? "#fff" : "rgba(255,255,255,0.32)"}
              pointerEvents="none"
            >
              {num}B
            </text>

            <path
              d={wedge(cx, cy, 39, 71, a0, a1)}
              fill={hue}
              fillOpacity={cA > 0 ? 0.3 + 0.65 * (cA / max) : 0.06}
              stroke={cA > 0 ? hue : "rgba(255,255,255,0.08)"}
              strokeWidth={cA > 0 ? 1.2 : 0.6}
            >
              <title>{`${num}A: ${cA}`}</title>
            </path>
            <text
              x={lxA}
              y={lyA + 3.5}
              textAnchor="middle"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight={cA > 0 ? "800" : "500"}
              fill={cA > 0 ? "#fff" : "rgba(255,255,255,0.38)"}
              pointerEvents="none"
            >
              {num}A
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={34} fill="#080b12" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      <text x={cx} y={cy - 1} textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="800" fill="#eef2fa">
        CAMELOT
      </text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#8b95ad">
        {keys.length} keys
      </text>
    </svg>
  );
}

import type { RiskLevel } from '@mailwatch/core';
import { LEVEL_COLOR, weekday } from '../lib/format.js';

export interface DayVolume {
  day: string;
  safe: number;
  suspicious: number;
  malicious: number;
}

const W = 640;
const H = 230;
const PAD = { top: 14, right: 8, bottom: 26, left: 34 };

const SERIES: RiskLevel[] = ['safe', 'suspicious', 'malicious'];

/** Ticks redondos: sube al siguiente múltiplo de 1, 2 o 5 por encima del máximo. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

export function VolumeChart({ data }: { data: DayVolume[] }) {
  if (data.length === 0) return null;

  const peak = Math.max(...data.flatMap((d) => [d.safe, d.suspicious, d.malicious]));
  const max = niceMax(peak);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;

  const ticks = [0, max / 2, max];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Volumen de correos por día y categoría">
      {ticks.map((tick) => (
        <g key={tick}>
          <line className="chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
          <text className="chart__axis" x={PAD.left - 9} y={y(tick) + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}

      {SERIES.map((level) => {
        const points = data.map((d, i) => `${x(i)},${y(d[level])}`).join(' ');
        const area = `${PAD.left},${y(0)} ${points} ${x(data.length - 1)},${y(0)}`;
        return (
          <g key={level}>
            <polygon points={area} fill={LEVEL_COLOR[level]} opacity="0.12" />
            <polyline
              points={points}
              fill="none"
              stroke={LEVEL_COLOR[level]}
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {data.map((d, i) => (
        <text key={d.day} className="chart__axis" x={x(i)} y={H - 6} textAnchor="middle">
          {i === data.length - 1 ? 'Hoy' : weekday(d.day)}
        </text>
      ))}
    </svg>
  );
}

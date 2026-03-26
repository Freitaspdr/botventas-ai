'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface ChartPoint {
  fecha: string;
  leads: number;
  citas: number;
  conversaciones: number;
}

const SERIES = [
  { key: 'conversaciones' as const, color: '#3b82f6', label: 'Conversaciones' },
  { key: 'leads'          as const, color: '#a78bfa', label: 'Leads' },
  { key: 'citas'          as const, color: '#22c55e', label: 'Citas' },
] as const;

function polyline(data: ChartPoint[], key: keyof ChartPoint, w: number, h: number, pad: number) {
  if (data.length < 2) return '';
  const vals = data.map(d => Number(d[key]));
  const max = Math.max(...vals, 1);
  return data.map((_, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - (vals[i] / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
}

export function AnalyticsChart({ data, dias }: { data: ChartPoint[]; dias: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  function setDias(d: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set('dias', String(d));
    router.push(`${pathname}?${p}`);
  }

  const W = 800, H = 200, PAD = 20;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.05)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-[13px]" style={{ color: '#a1a1aa' }}>Evolución</span>
          <div className="flex items-center gap-3">
            {SERIES.map(s => (
              <span key={s.key} className="flex items-center gap-1 text-[10px]" style={{ color: '#a1a1aa' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          {[7, 30, 90].map((d, i) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className="px-2.5 py-1 text-[11px] transition-colors"
              style={{
                background: dias === d ? 'rgba(255,255,255,0.06)' : 'transparent',
                color:      dias === d ? '#fafafa' : '#a1a1aa',
                borderRight: i < 2 ? '0.5px solid rgba(255,255,255,0.05)' : undefined,
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-[12px]" style={{ color: '#71717a' }}>
          Sin datos para este periodo
        </div>
      ) : (
        <div className="relative px-4 py-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ height: 200 }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <line
                key={t}
                x1={PAD}
                y1={PAD + t * (H - PAD * 2)}
                x2={W - PAD}
                y2={PAD + t * (H - PAD * 2)}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            ))}

            {/* Lines */}
            {SERIES.map(s => (
              <polyline
                key={s.key}
                points={polyline(data, s.key, W, H, PAD)}
                fill="none"
                stroke={s.color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
            ))}

            {/* Hover dots */}
            {hoverIdx !== null && data[hoverIdx] && SERIES.map(s => {
              const vals = data.map(d => Number(d[s.key]));
              const max = Math.max(...vals, 1);
              const x = PAD + (hoverIdx / (data.length - 1)) * (W - PAD * 2);
              const y = H - PAD - (vals[hoverIdx] / max) * (H - PAD * 2);
              return <circle key={s.key} cx={x} cy={y} r={3} fill={s.color} />;
            })}

            {/* Invisible hover rects */}
            {data.map((_, i) => {
              const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
              return (
                <rect
                  key={i}
                  x={x - 10}
                  y={0}
                  width={20}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoverIdx !== null && data[hoverIdx] && (
            <div
              className="absolute top-4 right-8 rounded-lg px-3 py-2 flex flex-col gap-1 pointer-events-none"
              style={{ background: '#1a1a1f', border: '0.5px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-[10px] mb-0.5" style={{ color: '#a1a1aa' }}>
                {new Date(data[hoverIdx].fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
              {SERIES.map(s => (
                <p key={s.key} className="text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: '#a1a1aa' }}>{s.label}:</span>
                  <span style={{ color: '#fafafa' }}>{data[hoverIdx][s.key]}</span>
                </p>
              ))}
            </div>
          )}

          {/* X axis dates */}
          <div className="flex justify-between mt-1 px-0.5">
            {[data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].filter(Boolean).map((d, i) => (
              <span key={i} className="text-[9px]" style={{ color: '#71717a' }}>
                {new Date(d.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

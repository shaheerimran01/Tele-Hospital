'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDay, pkr } from './dashboard-data';

export interface WeekPoint {
  date: string;
  label: string;
  isToday: boolean;
  appointments: number;
  earnings: number;
}

type Metric = 'appointments' | 'earnings';

const METRICS: { id: Metric; label: string }[] = [
  { id: 'appointments', label: 'Appointments' },
  { id: 'earnings', label: 'Earnings' },
];

/** 0, a "nice" step, and a max that the step divides evenly (about 3 gridlines). */
function niceScale(max: number, integer: boolean) {
  if (max <= 0) return integer ? { top: 4, step: 1 } : { top: 1000, step: 500 };
  const rough = max / 3;
  const pow = 10 ** Math.floor(Math.log10(rough));
  let step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  if (integer) step = Math.max(1, Math.ceil(step));
  const top = Math.max(Math.ceil(max / step) * step, integer ? 2 : step);
  return { top, step };
}

const compactPkr = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('en-PK', { maximumFractionDigits: 1 })}k` : `${n}`);

/**
 * Last 7 days as a single-series bar chart. Appointments and earnings have
 * different scales, so they are toggled rather than drawn on two axes.
 */
export default function WeeklyOverviewChart({ week }: { week: WeekPoint[] }) {
  const [metric, setMetric] = useState<Metric>('appointments');
  const [hover, setHover] = useState<number | null>(null);

  // Draw at the real pixel width so text stays readable on phones and desktops
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = week.map((d) => d[metric]);
  const { top, step } = niceScale(Math.max(...values), metric === 'appointments');
  const total = values.reduce((s, v) => s + v, 0);
  const fmtValue = (v: number) =>
    metric === 'earnings' ? pkr(v) : `${v} ${v === 1 ? 'consultation' : 'consultations'}`;
  const fmtTick = (v: number) => (metric === 'earnings' ? compactPkr(v) : `${v}`);

  // Geometry (viewBox units; the SVG scales to its container)
  const W = width;
  const H = width < 480 ? 200 : 240;
  const padL = 40;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const band = plotW / week.length;
  const barW = Math.min(48, band * 0.5);
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const hovered = hover != null ? week[hover] : null;

  return (
    <section className="rounded-2xl border border-[#e7e2d8] bg-white">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-5">
        <div>
          <h2 className="text-base font-semibold text-[#141b34]">Weekly overview</h2>
          <p className="mt-0.5 text-sm text-[#6b6f80]">
            Last 7 days ·{' '}
            <span className="font-semibold text-[#141b34]">
              {metric === 'earnings' ? pkr(total) : `${total} consultations`}
            </span>
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-[#f3f1ec] p-1" role="tablist" aria-label="Chart metric">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={metric === m.id}
              onClick={() => setMetric(m.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                metric === m.id ? 'bg-white text-[#141b34] shadow-sm' : 'text-[#6b6f80] hover:text-[#141b34]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-4 pt-3 sm:px-5">
        <div ref={boxRef} className="relative">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={`${metric === 'earnings' ? 'Earnings' : 'Appointments'} per day for the last 7 days`}
          onMouseLeave={() => setHover(null)}
        >
          {/* Grid + y ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? '#d9d3c6' : '#f1eee7'}
                strokeWidth={1}
              />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#8a8d99">
                {fmtTick(t)}
              </text>
            </g>
          ))}

          {week.map((d, i) => {
            const v = d[metric];
            const cx = padL + band * i + band / 2;
            const h = Math.max(0, y(0) - y(v));
            const r = Math.min(4, h / 2);
            const x0 = cx - barW / 2;
            const yTop = y(v);
            const fill = d.isToday ? '#b38a3a' : '#141b34';
            const dim = hover != null && hover !== i;
            return (
              <g key={d.date}>
                {/* Hit target: the full column */}
                <rect
                  x={padL + band * i}
                  y={padT}
                  width={band}
                  height={plotH}
                  fill={hover === i ? '#f7f4ec' : 'transparent'}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${formatDay(d.date)}: ${fmtValue(v)}`}
                  style={{ outline: 'none' }}
                />
                {h > 0 && (
                  <path
                    d={`M${x0},${y(0)} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${y(0)} Z`}
                    fill={fill}
                    opacity={dim ? 0.35 : 1}
                    pointerEvents="none"
                  />
                )}
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={d.isToday ? 700 : 500}
                  fill={d.isToday ? '#141b34' : '#8a8d99'}
                >
                  {d.isToday ? 'Today' : d.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hovered && hover != null && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg bg-[#141b34] px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${Math.min(88, Math.max(12, ((padL + band * hover + band / 2) / W) * 100))}%` }}
          >
            <p className="font-semibold">{hovered.isToday ? 'Today' : formatDay(hovered.date)}</p>
            <p className="mt-0.5 text-white/80">{fmtValue(hovered[metric])}</p>
          </div>
        )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 text-xs text-[#6b6f80]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#b38a3a]" aria-hidden /> Today
          </span>
          <span>
            {metric === 'earnings'
              ? 'Earnings count completed consultations only.'
              : 'Completed and confirmed consultations.'}
          </span>
        </div>

        {/* Screen-reader table */}
        <table className="sr-only">
          <caption>{metric === 'earnings' ? 'Earnings' : 'Appointments'} per day</caption>
          <tbody>
            {week.map((d) => (
              <tr key={d.date}>
                <th scope="row">{formatDay(d.date)}</th>
                <td>{fmtValue(d[metric])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

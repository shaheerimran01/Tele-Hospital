// Suggests NORMAL / HIGH / LOW for a lab result from its reference interval.
// Understands "13.5 - 17.5", "13.5–17.5", "< 200", "<= 5.0", "> 40", ">= 60",
// "Up to 5.0", "Less than 200", "More than 40". Text results (e.g. "Non-Reactive")
// and ranges it can't read give no suggestion.

import type { ReportFlag } from '@/app/lib/api/lab-reports';

const NUM = String.raw`(-?\d+(?:\.\d+)?)`;

/** "7,800" -> 7800, "14.2 g/dL" -> 14.2; null when it isn't a number */
export function parseNumber(value: string): number | null {
  const m = value.replace(/,/g, '').trim().match(/^[<>]?=?\s*(-?\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export function parseRange(range: string): { low: number | null; high: number | null } | null {
  const r = range.replace(/,/g, '').trim().toLowerCase();
  if (!r) return null;
  let m = r.match(new RegExp(`^${NUM}\\s*(?:-|–|—|to)\\s*${NUM}`));
  if (m) return { low: Number(m[1]), high: Number(m[2]) };
  m = r.match(new RegExp(`^(?:<=?|≤|up to|less than|below)\\s*${NUM}`));
  if (m) return { low: null, high: Number(m[1]) };
  m = r.match(new RegExp(`^(?:>=?|≥|more than|greater than|above)\\s*${NUM}`));
  if (m) return { low: Number(m[1]), high: null };
  return null;
}

export function suggestFlag(value: string, range: string): ReportFlag | null {
  const v = parseNumber(value);
  const r = parseRange(range);
  if (v === null || !r) return null;
  if (r.low !== null && v < r.low) return 'LOW';
  if (r.high !== null && v > r.high) return 'HIGH';
  return 'NORMAL';
}

export const FLAG_BADGE: Record<ReportFlag, string> = {
  NORMAL: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  HIGH: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  LOW: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  CRITICAL: 'bg-rose-600 text-white ring-rose-700',
};

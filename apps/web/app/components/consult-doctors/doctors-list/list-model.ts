// Filtering and sorting for the doctor listing, kept free of React.

import type { NearbyDoctor, ServiceMode } from '@/app/lib/api/doctors';

export type ModeFilter = 'ALL' | ServiceMode;
export type SortKey = 'distance' | 'rating' | 'experience';

export const MODE_TABS: { value: ModeFilter; label: string }[] = [
  { value: 'ALL', label: 'All Modes' },
  { value: 'IN_CLINIC', label: 'In-Clinic' },
  { value: 'VIDEO', label: 'Video Call' },
  { value: 'TEXT', label: 'Text Consult' },
];

export const PRICE_RANGES = [
  { value: 'any', label: 'Any price', min: 0, max: Infinity },
  { value: 'u1000', label: 'Under PKR 1,000', min: 0, max: 999.99 },
  { value: '1000-2500', label: 'PKR 1,000 – 2,500', min: 1000, max: 2500 },
  { value: '2500-5000', label: 'PKR 2,500 – 5,000', min: 2500, max: 5000 },
  { value: 'o5000', label: 'Above PKR 5,000', min: 5000.01, max: Infinity },
] as const;
export type PriceRange = (typeof PRICE_RANGES)[number]['value'];

export const SORT_OPTIONS: { value: SortKey; label: string; disabled?: boolean }[] = [
  { value: 'distance', label: 'Distance (Nearest First)' },
  // No ratings are stored yet, so this option is shown but cannot be chosen
  { value: 'rating', label: 'Rating (High to Low) · coming soon', disabled: true },
  { value: 'experience', label: 'Experience (Most First)' },
];

export function offersMode(d: NearbyDoctor, mode: ServiceMode): boolean {
  if (mode === 'IN_CLINIC') return d.clinics.length > 0;
  if (mode === 'VIDEO') return d.isVideoCallEnabled;
  return d.isTextConsultEnabled;
}

/** Fee for one mode (in-clinic uses the cheapest clinic), or null if not offered. */
export function feeFor(d: NearbyDoctor, mode: ServiceMode): number | null {
  if (!offersMode(d, mode)) return null;
  if (mode === 'IN_CLINIC') return d.minInPersonFee;
  if (mode === 'VIDEO') return d.videoCallFee ?? null;
  return d.textConsultFee ?? null;
}

/** The fee the price filter looks at: the chosen mode, or the cheapest offered mode. */
export function relevantFee(d: NearbyDoctor, mode: ModeFilter): number | null {
  if (mode !== 'ALL') return feeFor(d, mode);
  const fees = (['IN_CLINIC', 'VIDEO', 'TEXT'] as const)
    .map((m) => feeFor(d, m))
    .filter((f): f is number => f != null);
  return fees.length ? Math.min(...fees) : null;
}

export function applyFilters(
  doctors: NearbyDoctor[],
  opts: { mode: ModeFilter; price: PriceRange; sort: SortKey },
): NearbyDoctor[] {
  const range = PRICE_RANGES.find((r) => r.value === opts.price) ?? PRICE_RANGES[0];

  const list = doctors.filter((d) => {
    if (opts.mode !== 'ALL' && !offersMode(d, opts.mode)) return false;
    if (range.value === 'any') return true;
    const fee = relevantFee(d, opts.mode);
    return fee != null && fee >= range.min && fee <= range.max;
  });

  if (opts.sort === 'experience') {
    return [...list].sort(
      (a, b) =>
        b.experienceYears - a.experienceYears ||
        (a.minDistanceKm ?? Infinity) - (b.minDistanceKm ?? Infinity),
    );
  }
  // 'distance' (and 'rating' until ratings exist): the API already sorts nearest first
  return list;
}

export const formatPkr = (n: number) => `PKR ${n.toLocaleString('en-PK')}`;

export const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

// ---------------------------------------------------------------------------
// Clinics with distance (all clinics, nearest first)
// ---------------------------------------------------------------------------

export interface PatientPoint {
  latitude: number;
  longitude: number;
}

export type ClinicWithDistance = NearbyDoctor['clinics'][number] & {
  distanceKm: number | null;
  isNearest: boolean;
};

/** Haversine distance in km (same formula as the API). */
export function distanceKm(a: PatientPoint, b: PatientPoint): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Every clinic of a doctor with its distance from the patient. Clinics with a
 * map pin come first (nearest first); clinics without a pin keep their order.
 */
export function clinicsWithDistance(
  doctor: NearbyDoctor,
  patient: PatientPoint | null | undefined,
): ClinicWithDistance[] {
  const list = doctor.clinics.map((c) => {
    const hasPin = c.latitude != null && c.longitude != null;
    const km =
      patient && hasPin
        ? Math.round(distanceKm(patient, { latitude: c.latitude!, longitude: c.longitude! }) * 10) / 10
        : null;
    return { ...c, distanceKm: km, isNearest: false };
  });

  list.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return 0;
  });
  if (list.length > 1 && list[0].distanceKm != null) list[0].isNearest = true;
  return list;
}

/** "Jinnah Avenue, Blue Area, Islamabad, Islamabad Capital Territory, 44000, Pakistan" -> first 3 parts. */
export function shortAddress(address: string, parts = 3): string {
  const pieces = address
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !/^\d+$/.test(p) && p.toLowerCase() !== 'pakistan');
  return pieces.slice(0, parts).join(', ') || address;
}

// Admin: hospitals directory (/admin/hospitals on the API)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';
const BASE = `${API_BASE_URL}/admin/hospitals`;

export const HOSPITAL_EMERGENCY_OPTIONS = ['24/7', 'Available', 'Daytime'] as const;
export type HospitalEmergency = (typeof HOSPITAL_EMERGENCY_OPTIONS)[number];

export interface HospitalRecord {
  id: string;
  name: string;
  city: string | null;
  type: string | null;
  address: string;
  contact: string | null;
  latitude: number | null;
  longitude: number | null;
  emergency: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** registered doctors whose clinic matches this hospital (what patients see) */
  linkedDoctors?: { id: string; fullName: string }[];
}

export interface HospitalPage {
  items: HospitalRecord[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface HospitalInput {
  name: string;
  city: string | null;
  type: string | null;
  address: string;
  contact: string | null;
  latitude: number | null;
  longitude: number | null;
  emergency: HospitalEmergency | null;
  notes: string | null;
  isActive: boolean;
}

export class HospitalApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      cache: 'no-store',
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch {
    throw new HospitalApiError(`Could not reach the API at ${API_BASE_URL}. Is the server running?`, 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const raw = data?.message;
    throw new HospitalApiError(Array.isArray(raw) ? raw.join(' ') : raw || 'Something went wrong. Please try again.', res.status);
  }
  return res.json();
}

export function fetchHospitals(opts: { search?: string; page?: number; pageSize?: number } = {}) {
  const q = new URLSearchParams();
  if (opts.search?.trim()) q.set('search', opts.search.trim());
  if (opts.page) q.set('page', String(opts.page));
  if (opts.pageSize) q.set('pageSize', String(opts.pageSize));
  const qs = q.toString();
  return request<HospitalPage>(qs ? `?${qs}` : '');
}

export const createHospital = (input: HospitalInput) => request<HospitalRecord>('', { method: 'POST', body: JSON.stringify(input) });

export const updateHospital = (id: string, input: HospitalInput) =>
  request<HospitalRecord>(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteHospital = (id: string) =>
  request<{ id: string; name: string; deleted: boolean }>(`/${encodeURIComponent(id)}`, { method: 'DELETE' });

// apps/web/app/lib/api/hospitals.ts
// Patient flow: hospitals near the patient, with the registered doctors who practise there.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface HospitalDoctor {
  id: string;
  fullName: string;
  title: string;
  specialisations: string[];
  profilePhotoUrl: string | null;
  experienceYears: number;
  /** the doctor's clinic at this hospital (books an in-clinic visit there) */
  clinicId: string;
  clinicName: string;
  inPersonFee: number;
  /** same speciality as the patient's consultation request */
  matchesSpeciality: boolean;
}

export interface NearbyHospital {
  id: string;
  name: string;
  city: string | null;
  type: string | null;
  address: string;
  contact: string | null;
  latitude: number | null;
  longitude: number | null;
  /** "24/7" | "Available" | "Daytime" | null */
  emergency: string | null;
  notes: string | null;
  /** null when the patient or the hospital has no map location */
  distanceKm: number | null;
  availableDoctors: HospitalDoctor[];
}

export interface NearbyHospitalsResponse {
  patientLocation: { latitude: number; longitude: number; label: string | null } | null;
  speciality: string | null;
  intakeId: string | null;
  radiusKm: number | null;
  total: number;
  hospitals: NearbyHospital[];
}

export async function getNearbyHospitalsApi(params: {
  intakeId?: string | null;
  userId?: string | null;
  latitude?: number;
  longitude?: number;
  radius?: number;
  signal?: AbortSignal;
}): Promise<NearbyHospitalsResponse> {
  const q = new URLSearchParams({ limit: '100' });
  if (params.intakeId) q.set('intakeId', params.intakeId);
  if (params.userId) q.set('userId', params.userId);
  if (params.latitude !== undefined && params.longitude !== undefined) {
    q.set('latitude', String(params.latitude));
    q.set('longitude', String(params.longitude));
  }
  if (params.radius) q.set('radius', String(params.radius));
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/hospitals/nearby?${q}`, { cache: 'no-store', signal: params.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const raw = data?.message;
    throw new Error(Array.isArray(raw) ? raw[0] : raw || 'Could not load hospitals near you.');
  }
  return response.json();
}

/** Google Maps: the hospital's place page with a Directions button (pin when known, else name + address) */
export function hospitalMapsUrl(h: Pick<NearbyHospital, 'name' | 'address' | 'latitude' | 'longitude'>) {
  const query = h.latitude != null && h.longitude != null ? `${h.latitude},${h.longitude}` : `${h.name}, ${h.address}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Driving route from the patient's location (Google Maps works out "your location" when unknown) */
export function hospitalDirectionsUrl(
  h: Pick<NearbyHospital, 'name' | 'address' | 'latitude' | 'longitude'>,
  from?: { latitude: number; longitude: number } | null,
) {
  const destination = h.latitude != null && h.longitude != null ? `${h.latitude},${h.longitude}` : `${h.name}, ${h.address}`;
  const q = new URLSearchParams({ api: '1', destination });
  if (from) q.set('origin', `${from.latitude},${from.longitude}`);
  return `https://www.google.com/maps/dir/?${q}`;
}

/** OpenStreetMap view of the hospital (only when it has a pin) */
export function hospitalOsmUrl(h: Pick<NearbyHospital, 'latitude' | 'longitude'>) {
  if (h.latitude == null || h.longitude == null) return null;
  return `https://www.openstreetmap.org/?mlat=${h.latitude}&mlon=${h.longitude}#map=17/${h.latitude}/${h.longitude}`;
}

/** Book an in-clinic visit with a doctor at their clinic in this hospital */
export function hospitalDoctorBookingHref(d: Pick<HospitalDoctor, 'id' | 'clinicId'>, intakeId: string | null) {
  const q = new URLSearchParams({ doctorId: d.id, mode: 'IN_CLINIC', clinicId: d.clinicId });
  if (intakeId) q.set('intakeId', intakeId);
  return `/consult-doctors/book-appointment?${q}`;
}

// apps/web/app/lib/api/doctors.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface TimeSlotPayload {
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm" (24h) or "hh:mm AM" - the API normalises both
  endTime: string;
}

export interface DoctorClinicPayload {
  name: string;
  phone?: string;
  inPersonFee: number;
  address: string;
  latitude?: number;
  longitude?: number;
  schedules: TimeSlotPayload[];
}

export interface RegisterDoctorPayload {
  fullName: string;
  title: string;
  degrees: string;
  pmdcNumber: string;
  pmdcCertificateUrl?: string;
  experienceYears: number;
  languages: string[];
  phone: string;
  email?: string;
  specialisations: string[];
  education?: string;
  about?: string;
  profilePhotoUrl?: string;
  isVideoCallEnabled: boolean;
  videoCallFee?: number;
  isTextConsultEnabled: boolean;
  textConsultFee?: number;
  clinics: DoctorClinicPayload[];
  onlineAvailabilities: TimeSlotPayload[];
}

export type DoctorStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** The doctor's login record, stored in sessionStorage as `doctor_data`. */
export interface DoctorRegistration {
  id: string;
  phone: string;
  email: string | null;
  isFormFilled: boolean;
  status: DoctorStatus | string;
  doctorId: string | null;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface DoctorProfile {
  id: string;
  fullName: string;
  title: string;
  degrees: string;
  pmdcNumber: string;
  pmdcCertificateUrl?: string | null;
  experienceYears: number;
  languages: string[];
  phone: string;
  email?: string | null;
  specialisations: string[];
  education?: string | null;
  about?: string | null;
  profilePhotoUrl?: string | null;
  isVideoCallEnabled: boolean;
  videoCallFee?: number | null;
  isTextConsultEnabled: boolean;
  textConsultFee?: number | null;
  status: DoctorStatus;
  createdAt: string;
  clinics: {
    id: string;
    name: string;
    phone?: string | null;
    inPersonFee: number;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    schedules: TimeSlot[];
  }[];
  onlineAvailabilities: TimeSlot[];
}

export interface RegisterDoctorResponse {
  success: boolean;
  message: string;
  isFormFilled: true;
  doctorRegistration: DoctorRegistration;
  doctor: DoctorProfile;
}

export interface UploadedImage {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

/** Error carrying every message the API returned (validation errors come as a list). */
export class ApiError extends Error {
  constructor(public messages: string[], public status: number) {
    super(messages[0] || 'Something went wrong');
  }
}

async function toApiError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  const raw = data?.message;
  const messages = Array.isArray(raw) ? raw : raw ? [String(raw)] : [fallback];
  return new ApiError(messages, response.status);
}

/** Turns a relative /uploads/... path from the API into a full URL. */
export function apiFileUrl(path: string) {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

// ---------------------------------------------------------------------------
// Doctor auth (separate from patient login)
// ---------------------------------------------------------------------------

export interface SendDoctorOtpResponse {
  success: boolean;
  phone: string; // normalised, e.g. +923001234567
  exists: boolean;
  email: string | null; // masked, e.g. "ay***@g***.com"
  resendAfterSeconds: number;
}

export interface VerifyDoctorOtpResponse {
  success: boolean;
  token: string;
  isFormFilled: boolean;
  doctorRegistration: DoctorRegistration;
}

export interface DoctorMeResponse {
  isFormFilled: boolean;
  doctorRegistration: DoctorRegistration;
  doctor: DoctorProfile | null;
}

export async function sendDoctorOtpApi(phone: string): Promise<SendDoctorOtpResponse> {
  const response = await fetch(`${API_BASE}/doctors/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!response.ok) throw await toApiError(response, 'Could not send the OTP. Please try again.');
  return response.json();
}

export async function verifyDoctorOtpApi(phone: string, otp: string): Promise<VerifyDoctorOtpResponse> {
  const response = await fetch(`${API_BASE}/doctors/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });
  if (!response.ok) throw await toApiError(response, 'Could not verify the OTP. Please try again.');
  return response.json();
}

export async function getDoctorMeApi(token: string): Promise<DoctorMeResponse> {
  const response = await fetch(`${API_BASE}/doctors/auth/me`, {
    headers: authHeader(token),
    cache: 'no-store',
  });
  if (!response.ok) throw await toApiError(response, 'Could not load your doctor account.');
  return response.json();
}

// ---------------------------------------------------------------------------
// Registration form (requires the doctor token)
// ---------------------------------------------------------------------------

export async function uploadDoctorImageApi(token: string, file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/doctors/uploads`, {
    method: 'POST',
    headers: authHeader(token),
    body: formData,
  });
  if (!response.ok) {
    throw await toApiError(response, `Could not upload ${file.name}.`);
  }
  return response.json();
}

export async function registerDoctorApi(
  token: string,
  payload: RegisterDoctorPayload,
): Promise<RegisterDoctorResponse> {
  const response = await fetch(`${API_BASE}/doctors/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, 'Registration failed. Please try again.');
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// OpenStreetMap geocoding
//
// Suggestions while typing use Photon (photon.komoot.io), a free geocoder built
// on OpenStreetMap data that is designed for search-as-you-type. The public
// Nominatim server forbids autocomplete in its usage policy, so Nominatim is
// only used for one-off lookups (Enter / reverse geocoding when a pin moves).
// ---------------------------------------------------------------------------

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const PHOTON = 'https://photon.komoot.io';

/** Rough bounding box of Pakistan: minLon, minLat, maxLon, maxLat */
const PAKISTAN_BBOX = '60.8,23.6,77.9,37.1';

export interface GeocodeResult {
  displayName: string;
  /** Short first line, e.g. "Centaurus Mall" */
  title?: string;
  latitude: number;
  longitude: number;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    locality?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

/** Autocomplete suggestions for a clinic or area name (debounce calls ~300 ms). */
export async function suggestPlacesApi(
  query: string,
  signal?: AbortSignal,
  near?: { latitude: number; longitude: number },
): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({ q: query, limit: '6', lang: 'en', bbox: PAKISTAN_BBOX });
  if (near) {
    params.set('lat', String(near.latitude));
    params.set('lon', String(near.longitude));
  }
  const response = await fetch(`${PHOTON}/api/?${params}`, { signal });
  if (!response.ok) throw new Error('Place suggestions are unavailable right now.');

  const data: { features?: PhotonFeature[] } = await response.json();
  const seen = new Set<string>();
  return (data.features ?? [])
    .map((f) => {
      const p = f.properties;
      const street = [p.housenumber, p.street].filter(Boolean).join(' ');
      const parts = [p.name, street, p.district ?? p.locality, p.city ?? p.county, p.state, p.country]
        .filter((x): x is string => !!x)
        .filter((x, i, arr) => arr.indexOf(x) === i);
      return {
        title: parts[0],
        displayName: parts.join(', '),
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      };
    })
    .filter((r) => {
      if (seen.has(r.displayName)) return false;
      seen.add(r.displayName);
      return true;
    });
}

export async function searchAddressApi(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '0',
    limit: '5',
    countrycodes: 'pk',
  });
  const response = await fetch(`${NOMINATIM}/search?${params}`, {
    signal,
    headers: { 'Accept-Language': 'en' },
  });
  if (!response.ok) throw new Error('Address search is unavailable right now.');

  const data: { display_name: string; lat: string; lon: string }[] = await response.json();
  return data.map((r) => ({
    displayName: r.display_name,
    latitude: Number(r.lat),
    longitude: Number(r.lon),
  }));
}

export async function reverseGeocodeApi(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    zoom: '18',
  });
  const response = await fetch(`${NOMINATIM}/reverse?${params}`, {
    headers: { 'Accept-Language': 'en' },
  });
  if (!response.ok) return null;
  const data: { display_name?: string } = await response.json();
  return data.display_name ?? null;
}

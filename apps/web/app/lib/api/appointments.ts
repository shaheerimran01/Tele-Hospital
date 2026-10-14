// apps/web/app/lib/api/appointments.ts

import type { DoctorProfile, ServiceMode } from './doctors';
import type { PatientType, RelationType } from './consultation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type PaymentMethod = 'COD' | 'JAZZCASH' | 'EASYPAISA' | 'CARD';
export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface PublicClinic {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  inPersonFee: number;
  workingDays?: string[];
}

export interface PublicDoctor {
  id: string;
  fullName: string;
  title: string;
  degrees: string;
  experienceYears: number;
  specialisations: string[];
  languages: string[];
  profilePhotoUrl?: string | null;
  isVideoCallEnabled: boolean;
  videoCallFee?: number | null;
  isTextConsultEnabled: boolean;
  textConsultFee?: number | null;
}

export interface AvailableSlotsResponse {
  date: string;
  dayOfWeek: string;
  serviceMode: ServiceMode;
  slotMinutes: number;
  /** e.g. ["10:00 AM", "10:30 AM"] */
  availableSlots: string[];
  slots: { startTime: string; endTime: string }[];
  clinic: PublicClinic | null;
  fee: number;
  workingDays: string[];
  doctor: PublicDoctor & { clinics: PublicClinic[] };
}

export interface CreateAppointmentPayload {
  doctorId: string;
  clinicId?: string;
  intakeId?: string;
  patientType: PatientType;
  familyMemberId?: string;
  serviceMode: ServiceMode;
  /** YYYY-MM-DD */
  appointmentDate: string;
  startTime: string;
  endTime: string;
  paymentMethod: PaymentMethod;
}

export interface Appointment {
  id: string;
  appointmentNum: string;
  userId: string;
  patientType: PatientType;
  familyMemberId?: string | null;
  intakeId?: string | null;
  doctorId: string;
  clinicId?: string | null;
  serviceMode: ServiceMode;
  /** ISO date at UTC midnight */
  appointmentDate: string;
  startTime: string;
  endTime: string;
  fee: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  status: AppointmentStatus;
  cancelReason?: string | null;
  createdAt: string;
  doctor: PublicDoctor;
  clinic: PublicClinic | null;
  user: { id: string; firstName?: string | null; lastName?: string | null; phone?: string | null };
  familyMember: { id: string; fullName: string; relation: RelationType; gender: string; age?: number | null } | null;
  intake: {
    id: string;
    symptoms: string[];
    symptomDuration?: string | null;
    speciality?: { id: string; name: string } | null;
  } | null;
}

/** Error with the HTTP status, so callers can tell "slot taken" (409) apart. */
export class AppointmentApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AppointmentApiError';
  }
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
  return new AppointmentApiError(message || fallback, response.status);
}

const withUser = (userId: string) => `userId=${encodeURIComponent(userId)}`;

/** Public doctor profile (modes, fees, clinics and weekly hours). */
export async function getDoctorForBookingApi(doctorId: string, signal?: AbortSignal): Promise<DoctorProfile> {
  const response = await fetch(`${API_BASE}/doctors/${encodeURIComponent(doctorId)}`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw await readError(response, 'Could not load the doctor.');
  return response.json();
}

export async function getAvailableSlotsApi(
  params: { doctorId: string; serviceMode: ServiceMode; clinicId?: string | null; date: string },
  signal?: AbortSignal,
): Promise<AvailableSlotsResponse> {
  const qs = new URLSearchParams({
    doctorId: params.doctorId,
    serviceMode: params.serviceMode,
    date: params.date,
  });
  if (params.clinicId) qs.set('clinicId', params.clinicId);
  const response = await fetch(`${API_BASE}/appointments/available-slots?${qs}`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw await readError(response, 'Could not load available times.');
  return response.json();
}

export async function createAppointmentApi(
  userId: string,
  payload: CreateAppointmentPayload,
): Promise<Appointment> {
  const response = await fetch(`${API_BASE}/appointments?${withUser(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, userId }),
  });
  if (!response.ok) throw await readError(response, 'Could not book the appointment.');
  return response.json();
}

export async function getAppointmentApi(userId: string, id: string): Promise<Appointment> {
  const response = await fetch(`${API_BASE}/appointments/${encodeURIComponent(id)}?${withUser(userId)}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw await readError(response, 'Could not load the appointment.');
  return response.json();
}

export async function getMyAppointmentsApi(userId: string): Promise<Appointment[]> {
  const response = await fetch(`${API_BASE}/appointments?${withUser(userId)}`, { cache: 'no-store' });
  if (!response.ok) throw await readError(response, 'Could not load your appointments.');
  return response.json();
}

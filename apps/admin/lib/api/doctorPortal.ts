// Admin Doctor Portal API (apps/api: /admin/doctor-portal/*)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE = `${API_BASE_URL}/admin/doctor-portal`;

export type DoctorStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';
export type ServiceMode = 'IN_CLINIC' | 'VIDEO' | 'TEXT';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PatientType = 'SELF' | 'FAMILY_MEMBER';
export type CaseRow = AppointmentRow & {
  caseOpen: boolean;
  stage?: ResolutionStage;
  forwardedAt?: string | null;
  recommendedAt?: string | null;
} & RequestInfo;

/** The admin's latest "Request Appointment with Dr. X" for a case */
export interface RequestInfo {
  requestedAt?: string | null;
  requestedAppointmentNum?: string | null;
  requestedDoctorName?: string | null;
}

export type NotificationFilter = 'ALL' | 'UNREAD' | 'READ' | 'DOCTORS' | 'APPOINTMENTS' | 'DECLINED' | 'RESCHEDULED';

export interface TimeSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface DoctorBrief {
  id: string;
  fullName: string;
  title: string;
  specialisations: string[];
  pmdcNumber: string;
  profilePhotoUrl: string | null;
}

export interface UserBrief {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
}

export interface FamilyMemberBrief {
  id: string;
  fullName: string;
  relation: string;
  gender: string;
  age: number | null;
}

export interface AppointmentRow {
  id: string;
  appointmentNum: string;
  status: AppointmentStatus;
  serviceMode: ServiceMode;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  fee: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  /** doctor's note when declined / rescheduled (or the admin's cancel reason) */
  cancelReason: string | null;
  patientType: PatientType;
  patientName: string;
  familyMember: FamilyMemberBrief | null;
  user: UserBrief | null;
  doctor: DoctorBrief;
  clinic: { id: string; name: string; address: string } | null;
  createdAt: string;
}

/**
 * Follow-up step after a doctor reschedules or declines:
 * AWAITING_FORWARD (admin sends the new time) -> RESCHEDULE_PROPOSED (patient replies)
 * -> AWAITING_DOCTOR (doctor accepts the patient's time);
 * AWAITING_RECOMMENDATION (admin chooses a doctor) -> AWAITING_DOCTOR_APPROVAL (that doctor approves
 * or declines) -> REASSIGNED (approved; the patient was told). ALTERNATIVE_RECOMMENDED: older cases
 * where a doctor was recommended to the patient to book themselves.
 */
export type ResolutionStage =
  | 'AWAITING_FORWARD'
  | 'RESCHEDULE_PROPOSED'
  | 'AWAITING_DOCTOR'
  | 'AWAITING_RECOMMENDATION'
  | 'ALTERNATIVE_RECOMMENDED'
  | 'AWAITING_DOCTOR_APPROVAL'
  | 'REASSIGNED'
  | null;

export interface PortalNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  category: 'DOCTORS' | 'APPOINTMENTS';
  link: { kind: 'appointment' | 'doctor'; id: string } | null;
  /** the appointment this is about (current state) */
  appointment: {
    id: string;
    appointmentNum: string;
    status: AppointmentStatus;
    doctorName: string;
    patientName: string;
    stage: ResolutionStage;
    forwardedAt: string | null;
    recommendedAt: string | null;
    recommendedDoctorName: string | null;
  } & RequestInfo | null;
  /** the doctor's note for declined / rescheduled notifications */
  reason: string | null;
}

export interface OverviewResponse {
  metrics: {
    totalPatients: number;
    totalDoctors: number;
    pendingDoctors: number;
    totalAppointments: number;
    pendingAppointments: number;
    unreadNotifications: number;
  };
  recentAppointments: AppointmentRow[];
  recentNotifications: PortalNotification[];
}

export interface PortalCounts {
  unreadNotifications: number;
  pendingAppointments: number;
  pendingDoctors: number;
}

export interface DoctorListItem extends DoctorBrief {
  degrees: string;
  education: string | null;
  experienceYears: number;
  status: DoctorStatus;
  isActive: boolean;
  createdAt: string;
  _count: { appointments: number; clinics: number };
}

export interface DoctorsResponse {
  doctors: DoctorListItem[];
  statusCounts: Record<'ALL' | DoctorStatus, number>;
}

export interface DoctorDetail extends DoctorBrief {
  degrees: string;
  experienceYears: number;
  languages: string[];
  phone: string;
  email: string | null;
  education: string | null;
  about: string | null;
  pmdcCertificateUrl: string | null;
  isVideoCallEnabled: boolean;
  videoCallFee: number | null;
  isTextConsultEnabled: boolean;
  textConsultFee: number | null;
  status: DoctorStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinics: {
    id: string;
    name: string;
    phone: string | null;
    inPersonFee: number;
    address: string;
    latitude: number | null;
    longitude: number | null;
    schedules: TimeSlot[];
  }[];
  onlineAvailabilities: TimeSlot[];
  _count: { appointments: number };
  recentAppointments: AppointmentRow[];
  appointmentStatusCounts: Partial<Record<AppointmentStatus, number>>;
}

export interface PatientListItem extends UserBrief {
  createdAt: string;
  _count: { familyMembers: number; appointments: number };
}

export interface PatientDetail extends UserBrief {
  createdAt: string;
  familyMembers: (FamilyMemberBrief & { dateOfBirth: string | null; createdAt: string })[];
  _count: { appointments: number; consultationIntakes: number };
  appointments: AppointmentRow[];
  totalSpent: number;
}

export interface AppointmentDetail {
  id: string;
  appointmentNum: string;
  status: AppointmentStatus;
  serviceMode: ServiceMode;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  fee: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  patientType: PatientType;
  patientName: string;
  cancelReason: string | null;
  doctorNotes: string | null;
  prescriptionUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserBrief & { createdAt: string };
  familyMember: (FamilyMemberBrief & { dateOfBirth: string | null }) | null;
  doctor: DoctorBrief & {
    degrees: string;
    experienceYears: number;
    phone: string;
    email: string | null;
    status: DoctorStatus;
  };
  clinic: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
    inPersonFee: number;
  } | null;
  intake: {
    id: string;
    patientType: PatientType;
    symptoms: string[];
    symptomDuration: string | null;
    description: string | null;
    attachments: string[];
    status: string;
    createdAt: string;
    speciality: { id: string; name: string } | null;
    familyMember: FamilyMemberBrief | null;
  } | null;
}

export class PortalApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'PortalApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      cache: 'no-store',
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new PortalApiError(`Could not reach the API at ${API_BASE_URL}. Is the server running?`, 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new PortalApiError(message || `Request failed (${res.status})`, res.status);
  }
  return res.json();
}

const qs = (params: Record<string, string | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const fileUrl = (path: string) =>
  path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

export const fetchOverview = () => request<OverviewResponse>('/overview');
export const fetchPortalCounts = () => request<PortalCounts>('/counts');

export const fetchDoctors = (p: { search?: string; status?: string }) =>
  request<DoctorsResponse>(`/doctors${qs(p)}`);
export const fetchDoctor = (id: string) => request<DoctorDetail>(`/doctors/${encodeURIComponent(id)}`);
export const updateDoctorStatus = (id: string, status: DoctorStatus) =>
  request<DoctorDetail>(`/doctors/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const fetchPatients = (p: { search?: string }) =>
  request<{ patients: PatientListItem[]; total: number }>(`/patients${qs(p)}`);
export const fetchPatient = (id: string) => request<PatientDetail>(`/patients/${encodeURIComponent(id)}`);

export const fetchAppointments = (p: {
  search?: string;
  status?: string;
  serviceMode?: string;
  queue?: 'DOCTOR_ACTIONS';
  includeResolved?: boolean;
}) =>
  request<{
    appointments: CaseRow[];
    total: number;
    statusCounts: Partial<Record<AppointmentStatus, number>>;
    openCaseCount: number;
  }>(`/appointments${qs({ ...p, includeResolved: p.includeResolved ? 'true' : undefined })}`);

// --- Declined / rescheduled cases --------------------------------------------

export interface ReassignOptions {
  date: string;
  startTime: string;
  serviceMode: ServiceMode;
  speciality: string | null;
  /** set when the booking date has passed or is too far ahead */
  dateProblem: string | null;
  doctors: {
    doctorId: string;
    fullName: string;
    title: string;
    specialisations: string[];
    experienceYears: number;
    matchesSpeciality: boolean;
    options: { clinicId: string | null; clinicName: string | null; address: string | null; fee: number | null; available: boolean }[];
  }[];
}

export const resolveAppointmentCase = (id: string) =>
  request<AppointmentDetail>(`/appointments/${encodeURIComponent(id)}/resolve`, { method: 'POST' });
export const refundAppointment = (id: string) =>
  request<AppointmentDetail>(`/appointments/${encodeURIComponent(id)}/refund`, { method: 'POST' });
export const fetchReassignOptions = (id: string) =>
  request<ReassignOptions>(`/appointments/${encodeURIComponent(id)}/reassign-options`);
export const reassignAppointment = (id: string, doctorId: string, clinicId?: string | null) =>
  request<AppointmentDetail>(`/appointments/${encodeURIComponent(id)}/reassign`, {
    method: 'POST',
    body: JSON.stringify({ doctorId, ...(clinicId ? { clinicId } : {}) }),
  });
export const fetchAppointment = (id: string) =>
  request<AppointmentDetail>(`/appointments/${encodeURIComponent(id)}`);
export const updateAppointmentStatus = (id: string, status: AppointmentStatus, cancelReason?: string) =>
  request<AppointmentDetail>(`/appointments/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(cancelReason ? { cancelReason } : {}) }),
  });

export const fetchPortalNotifications = (filter: NotificationFilter) =>
  request<{ notifications: PortalNotification[]; counts: Record<NotificationFilter, number> }>(
    `/notifications${qs({ filter })}`,
  );
export const markAllPortalNotificationsRead = () =>
  request<{ updated: number }>('/notifications/read-all', { method: 'PATCH' });

/** Uses the existing shared endpoint (PATCH /notifications/:id/read). */
export async function markPortalNotificationRead(id: string) {
  const res = await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  if (!res.ok) throw new PortalApiError('Could not mark the notification as read.', res.status);
}

// --- Follow-up: admin -> patient -> doctor (apps/api: /appointments/:id/*) ----------

async function requestAppointments<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/appointments${path}`, {
      cache: 'no-store',
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new PortalApiError(`Could not reach the API at ${API_BASE_URL}. Is the server running?`, 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new PortalApiError(message || `Request failed (${res.status})`, res.status);
  }
  return res.json();
}

/** Where one appointment's follow-up stands */
export interface ResolutionSummary {
  id: string;
  appointmentNum: string;
  status: AppointmentStatus;
  serviceMode: ServiceMode;
  appointmentDate: string;
  startTime: string;
  fee: number;
  /** the doctor's (or patient's) note */
  reason: string | null;
  doctorName: string;
  patientName: string;
  stage: ResolutionStage;
  forwardedAt: string | null;
  alternativeRequestedAt: string | null;
  recommendedAt: string | null;
  recommendedDoctor: { id: string; name: string } | null;
  /** the latest "Request Appointment with Dr. X" */
  request: {
    at: string;
    appointmentId: string;
    appointmentNum: string;
    status: AppointmentStatus;
    appointmentDate: string;
    startTime: string;
    doctor: { id: string; name: string };
  } | null;
}

export interface AlternativeDoctorsResponse {
  appointment: ResolutionSummary;
  /** speciality the patient needs (from the consultation request, else the original doctor's) */
  speciality: string[];
  serviceMode: ServiceMode;
  originalFee: number;
  /** "03:00 PM" */
  originalTime: string;
  /** "YYYY-MM-DD" */
  originalDate: string;
  /** the day the doctors' free times are for */
  date: string;
  today: string;
  maxDate: string;
  /** suggested fee filter: original fee ±20% */
  feeRange: { min: number; max: number };
  /** "same": only doctors offering the original consultation type */
  modes: 'same' | 'all';
  doctors: {
    doctorId: string;
    fullName: string;
    title: string;
    pmdcNumber: string;
    specialisations: string[];
    experienceYears: number;
    profilePhotoUrl: string | null;
    /** consultation type the fee and free times are for */
    serviceMode: ServiceMode;
    offersSameMode: boolean;
    /** every consultation type the doctor offers, with its lowest fee */
    modes: { mode: ServiceMode; fee: number }[];
    fees: { clinicId: string | null; clinicName: string | null; fee: number }[];
    /** lowest fee for this consultation type */
    fee: number;
    matchesSpeciality: boolean;
    withinFeeRange: boolean;
    /** free start times on `date` ("10:30 AM") */
    freeSlots: string[];
    /** the same times with the clinic each is at (in-clinic visits) */
    freeTimes: { startTime: string; clinicId: string | null }[];
    availableAtOriginalTime: boolean;
  }[];
}

export const fetchResolution = (id: string) =>
  requestAppointments<ResolutionSummary>(`/${encodeURIComponent(id)}/resolution`);

export const forwardRescheduleToPatient = (id: string, note?: string) =>
  requestAppointments<ResolutionSummary>(`/${encodeURIComponent(id)}/forward-reschedule`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });

export const fetchAlternativeDoctors = (id: string, opts: { date?: string; modes?: 'same' | 'all' } = {}) => {
  const q = new URLSearchParams();
  if (opts.date) q.set('date', opts.date);
  if (opts.modes) q.set('modes', opts.modes);
  const qs = q.toString();
  return requestAppointments<AlternativeDoctorsResponse>(`/${encodeURIComponent(id)}/alternative-doctors${qs ? `?${qs}` : ''}`);
};

/** Admin -> new doctor: a pending appointment the doctor approves or declines (the patient is told after approval). */
export const requestAlternativeAppointment = (
  id: string,
  body: { doctorId: string; date: string; startTime: string; serviceMode?: ServiceMode; clinicId?: string; note?: string },
) =>
  requestAppointments<ResolutionSummary>(`/${encodeURIComponent(id)}/request-alternative`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** Admin: cancel a request the new doctor hasn't answered yet */
export const withdrawAlternativeRequest = (id: string) =>
  requestAppointments<ResolutionSummary>(`/${encodeURIComponent(id)}/withdraw-request`, { method: 'POST' });

export const recommendAlternativeDoctor = (id: string, doctorId: string, note?: string, serviceMode?: ServiceMode) =>
  requestAppointments<ResolutionSummary>(`/${encodeURIComponent(id)}/recommend-alternative`, {
    method: 'POST',
    body: JSON.stringify({ doctorId, ...(note ? { note } : {}), ...(serviceMode ? { serviceMode } : {}) }),
  });

// Who is opening a consultation room, and where the room's links go.

import { readPatientSession } from '@/app/lib/patient-session';
import type { ParticipantRole, RoomMode, Viewer } from '@/app/lib/api/consultations';

const DOCTOR_TOKEN_KEY = 'doctor_token';
const DOCTOR_DATA_KEY = 'doctor_data';

/**
 * The doctor portal opens rooms with ?as=doctor (a browser can hold both a doctor
 * and a patient login), so the doctor's token is used only then.
 */
export function readViewer(asDoctor: boolean): Viewer | null {
  try {
    if (asDoctor) {
      const token = sessionStorage.getItem(DOCTOR_TOKEN_KEY);
      if (!token) return null;
      return { role: 'DOCTOR', token };
    }
  } catch {
    return null;
  }
  const patient = readPatientSession();
  return patient ? { role: 'USER', userId: patient.id, name: patient.name } : null;
}

export const hasDoctorData = () => {
  try {
    return !!sessionStorage.getItem(DOCTOR_DATA_KEY);
  } catch {
    return false;
  }
};

export const dashboardHref = (role: ParticipantRole) =>
  role === 'DOCTOR' ? '/consult-doctors/doctor-dashboard' : '/consult-doctors/my-appointments';

export const dashboardLabel = (role: ParticipantRole) => (role === 'DOCTOR' ? 'Back to Dashboard' : 'Back to My Appointments');

export function roomHref(appointmentId: string, mode: RoomMode | null, role: ParticipantRole, extra = '') {
  const base = `/consultations/${encodeURIComponent(appointmentId)}${mode ? `/${mode.toLowerCase()}` : ''}`;
  const params = [role === 'DOCTOR' ? 'as=doctor' : '', extra].filter(Boolean).join('&');
  return params ? `${base}?${params}` : base;
}

/** "08:42" / "1:05:09" */
export function clock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`;
}

export const displayTime = (t: string) => t.replace(/^0(\d)/, '$1');

export const MODE_LABEL: Record<string, string> = {
  VIDEO: 'Video consultation',
  TEXT: 'Text consultation',
  IN_CLINIC: 'In-clinic visit',
};

export function initials(name: string) {
  return name
    .replace(/^(dr|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

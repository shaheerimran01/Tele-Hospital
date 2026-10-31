// apps/web/app/lib/api/prescriptions-doctor.ts
// Digital prescriptions written in the Doctor Portal (/doctors/me/prescriptions). Doctor login token only.

import { doctorMeCall } from './doctor-dashboard';
import type { ServiceMode } from './doctors';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface ConsultationPrescription {
  id: string;
  appointmentId: string;
  diagnosis: string | null;
  medicines: PrescriptionMedicine[];
  labTests: string[];
  advice: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionDraft {
  appointment: {
    id: string;
    appointmentNum: string;
    status: string;
    serviceMode: ServiceMode;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    symptoms: string[];
  };
  canPrescribe: boolean;
  patient: { name: string; age: string | null; gender: string | null; phone: string | null; bookedBy: string | null };
  doctor: {
    name: string;
    title: string;
    degrees: string;
    pmdcNumber: string;
    phone: string | null;
    email: string | null;
    specialisation: string | null;
  };
  prescription: ConsultationPrescription | null;
}

export interface PrescriptionListItem {
  id: string;
  appointmentId: string;
  appointmentNum: string;
  serviceMode: ServiceMode;
  appointmentDate: string;
  startTime: string;
  appointmentStatus: string;
  patientName: string;
  diagnosis: string | null;
  medicineCount: number;
  labTests: string[];
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavePrescriptionPayload {
  appointmentId: string;
  diagnosis?: string;
  medicines: PrescriptionMedicine[];
  labTests: string[];
  advice?: string;
  patientAge?: string;
  patientGender?: 'Male' | 'Female' | 'Other';
}

/** Absolute URL for a PDF stored by the API ("/uploads/...") */
export const prescriptionPdfUrl = (path: string) => (path.startsWith('http') ? path : `${API_BASE}${path}`);

export const getPrescriptionDraftApi = (token: string, appointmentId: string) =>
  doctorMeCall<PrescriptionDraft>(
    token,
    `/prescriptions/draft?appointmentId=${encodeURIComponent(appointmentId)}`,
    {},
    'Could not load this appointment.',
  );

export const savePrescriptionApi = (token: string, payload: SavePrescriptionPayload) =>
  doctorMeCall<{ created: boolean; prescription: ConsultationPrescription; pdfUrl: string }>(
    token,
    '/prescriptions',
    { method: 'POST', body: JSON.stringify(payload) },
    'Could not save the prescription.',
  );

export const getMyPrescriptionsApi = (token: string) =>
  doctorMeCall<PrescriptionListItem[]>(token, '/prescriptions', {}, 'Could not load your prescriptions.');

// Lab diagnostic reports (apps/api: /lab-prescriptions). Lab portal only: every
// call sends the signed-in lab's token. Pharmacy prescriptions live elsewhere.

import { API_BASE } from './lab-tests';
import { LabPortalError, clearLabSession, labAuthHeader, type LabPrescriptionSummary, type TestResultItem } from './lab-portal';

export type ReportFlag = 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';

export interface LabReportPayload {
  /** LabOrder id or order number */
  labOrderId: string;
  pathologistName: string;
  pathologistDesignation?: string;
  pathologistSignUrl?: string;
  /** ISO date-time */
  sampleCollectedAt?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  testResults: TestResultItem[];
  remarks?: string;
  instructions?: string;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...init, headers: { ...labAuthHeader(), ...init.headers } });
  } catch {
    throw new LabPortalError('Could not reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) clearLabSession();
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new LabPortalError(message || 'Something went wrong. Please try again.', res.status);
  }
  return res;
}

const jsonBody = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** The report as it will be issued, with a PREVIEW watermark (nothing is saved) */
export async function previewLabReportApi(payload: LabReportPayload): Promise<Blob> {
  const res = await send('/lab-prescriptions/preview', jsonBody(payload));
  return res.blob();
}

/** Issue the report: saves results, generates the PDF, order -> REPORT_UPLOADED, patient notified */
export async function issueLabReportApi(payload: LabReportPayload): Promise<LabPrescriptionSummary> {
  const res = await send('/lab-prescriptions', jsonBody(payload));
  return res.json();
}

/** PNG / JPG signature or stamp -> its stored URL for pathologistSignUrl */
export async function uploadLabSignatureApi(file: File): Promise<{ url: string }> {
  const body = new FormData();
  body.append('signature', file);
  const res = await send('/lab-prescriptions/signature', { method: 'POST', body });
  return res.json();
}

/** The report already issued for an order, or null */
export async function getLabReportForOrderApi(orderId: string): Promise<LabPrescriptionSummary | null> {
  try {
    const res = await send(`/lab-prescriptions/${encodeURIComponent(orderId)}`, { method: 'GET' });
    return (await res.json()) as LabPrescriptionSummary;
  } catch (e) {
    if (e instanceof LabPortalError && e.status === 404) return null;
    throw e;
  }
}

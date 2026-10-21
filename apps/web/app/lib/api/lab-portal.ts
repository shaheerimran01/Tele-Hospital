// Lab portal: phone + OTP sign-in, registration and the lab's own dashboard data
// (apps/api: /labs/auth, /labs/register, /labs/me). The session token is kept in
// sessionStorage (like the doctor portal), so it ends when the browser tab closes.

import { API_BASE } from './lab-tests';

const TOKEN_KEY = 'lab_token';
const PHONE_KEY = 'lab_phone';

export type LabVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RegulatoryBodyCode = 'PHC' | 'SHC' | 'KPK_HCC' | 'B_HCC' | 'FEDERAL' | 'OTHER';

export interface LabSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  verificationStatus: LabVerificationStatus;
}

export interface LabProfile extends LabSummary {
  email: string;
  phone: string;
  whatsappNumber: string | null;
  licenseNumber: string;
  regulatoryBody: RegulatoryBodyCode;
  licenseDocUrl: string;
  isVerified: boolean;
  rejectionReason: string | null;
  hasHomeSample: boolean;
  homeSampleFee: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabBranchInfo {
  id: string;
  name: string;
  isMainCenter: boolean;
  medicalDirectorName: string;
  medicalCouncilLicenseNo: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  isActive: boolean;
}

export type FixTarget = 'documents' | 'branches' | 'profile';

export interface LabOverview {
  laboratory: LabProfile;
  branches: LabBranchInfo[];
  stats: {
    branches: number;
    activeBranches: number;
    customPriced: number;
    unavailableItems: number;
    bookings: { tracked: boolean; revenue: number; completed: number; pending: number };
  };
  issues: { id: string; text: string; target: FixTarget }[];
  canResubmit: boolean;
}

export class LabPortalError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export function getLabSession(): { token: string; phone: string } | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const phone = sessionStorage.getItem(PHONE_KEY);
    return token && phone ? { token, phone } : null;
  } catch {
    return null;
  }
}

export function setLabSession(token: string, phone: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(PHONE_KEY, phone);
  } catch {
    // storage unavailable (private mode): the session lasts until reload
  }
}

export function clearLabSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PHONE_KEY);
  } catch {
    // ignore
  }
}

export const labAuthHeader = (): Record<string, string> => {
  const s = getLabSession();
  return s ? { Authorization: `Bearer ${s.token}` } : {};
};

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      ...init,
      headers: { ...(isForm || !init.body ? {} : { 'Content-Type': 'application/json' }), ...(auth ? labAuthHeader() : {}), ...init.headers },
    });
  } catch {
    throw new LabPortalError('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth) clearLabSession();
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new LabPortalError(message || 'Something went wrong. Please try again.', res.status);
  }
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const sendLabOtpApi = (phone: string) =>
  request<{ success: boolean; phone: string; resendAfterSeconds: number; expiresInMinutes: number }>('/labs/auth/send-otp', json('POST', { phone }), false);

export const verifyLabOtpApi = (phone: string, otp: string) =>
  request<{ token: string; phone: string; registered: boolean; laboratory: LabSummary | null }>('/labs/auth/verify-otp', json('POST', { phone, otp }), false);

export const labMeApi = () => request<{ phone: string; registered: boolean; laboratory: LabSummary | null }>('/labs/auth/me');

export const registerLabApi = (body: FormData) => request<LabProfile & { branches: LabBranchInfo[] }>('/labs/register', { method: 'POST', body });

export const getLabOverviewApi = () => request<LabOverview>('/labs/me/overview');

export const updateLabProfileApi = (body: Partial<Pick<LabProfile, 'name' | 'email' | 'whatsappNumber' | 'hasHomeSample' | 'homeSampleFee'>>) =>
  request<LabProfile>('/labs/me/profile', json('PATCH', body));

export const updateLabDocumentsApi = (body: FormData) => request<LabProfile>('/labs/me/documents', { method: 'POST', body });

export const updateLabBranchApi = (branchId: string, body: Partial<Pick<LabBranchInfo, 'name' | 'medicalDirectorName' | 'medicalCouncilLicenseNo' | 'address' | 'phone'>>) =>
  request<{ branch: LabBranchInfo; sentForReview: boolean }>(`/labs/me/branches/${encodeURIComponent(branchId)}`, json('PATCH', body));

export const resubmitLabApi = () => request<LabProfile>('/labs/me/resubmit', { method: 'POST' });

/** "/uploads/labs/..." -> absolute URL on the API server */
export const labFileUrl = (path: string | null | undefined) => (!path ? null : /^https?:/i.test(path) ? path : `${API_BASE}${path}`);

/** "+923001234567" -> "+92 300 1234567" */
export const displayPhone = (phone: string | null | undefined) => {
  if (!phone) return '';
  const m = phone.match(/^\+92(\d{3})(\d{7})$/);
  return m ? `+92 ${m[1]} ${m[2]}` : phone;
};

/** "0300 1234567" / "3001234567" -> "+923001234567" (Pakistani mobile), or null */
export function toPkMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const national = digits.startsWith('92') ? digits.slice(2) : digits.replace(/^0+/, '');
  return /^3\d{9}$/.test(national) ? `+92${national}` : null;
}

export const REGULATORY_LABELS: Record<RegulatoryBodyCode, string> = {
  PHC: 'Punjab Healthcare Commission (PHC)',
  SHC: 'Sindh Healthcare Commission (SHC)',
  KPK_HCC: 'KPK Healthcare Commission',
  B_HCC: 'Balochistan Healthcare Commission',
  FEDERAL: 'Federal Regulatory Authority',
  OTHER: 'Other',
};

// apps/web/app/lib/api/consultation.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type PatientType = 'SELF' | 'FAMILY_MEMBER';
export type RelationType = 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';

export interface Speciality {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
  description?: string | null;
  category?: string | null;
  isActive: boolean;
}

export interface FamilyMember {
  id: string;
  userId: string;
  fullName: string;
  relation: RelationType;
  gender: string;
  age?: number | null;
  dateOfBirth?: string | null;
  createdAt: string;
}

export interface CreateFamilyMemberPayload {
  fullName: string;
  relation: RelationType;
  gender: 'Male' | 'Female';
  age: number;
  dateOfBirth?: string;
}

export interface CreateIntakePayload {
  patientType: PatientType;
  familyMemberId?: string;
  specialityId: string;
  symptoms: string[];
  symptomDuration?: string;
  description?: string;
  attachments?: string[];
}

export interface ConsultationIntake {
  id: string;
  userId: string;
  patientType: PatientType;
  familyMemberId?: string | null;
  specialityId: string;
  symptoms: string[];
  symptomDuration?: string | null;
  description?: string | null;
  attachments: string[];
  patientAddress?: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  speciality?: Speciality;
  familyMember?: FamilyMember | null;
}

export interface UploadedAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface SavedAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  area?: string | null;
  city: string;
  province?: string | null;
  country: string;
  isDefault: boolean;
}

export const RELATION_OPTIONS: { value: RelationType; label: string }[] = [
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'CHILD', label: 'Child' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'OTHER', label: 'Other' },
];

export function relationLabel(relation?: string | null) {
  return RELATION_OPTIONS.find((r) => r.value === relation)?.label ?? 'Family';
}

/** Turns a relative /uploads/... path from the API into a full URL. */
export function apiFileUrl(path: string) {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  const message = Array.isArray(data?.message)
    ? data.message[0]
    : data?.message;
  return new Error(message || fallback);
}

export async function getSpecialitiesApi(params: {
  search?: string;
  category?: string;
  signal?: AbortSignal;
} = {}): Promise<Speciality[]> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.category && params.category !== 'All') {
    query.set('category', params.category);
  }

  const qs = query.toString();
  const response = await fetch(
    `${API_BASE}/consultation/specialities${qs ? `?${qs}` : ''}`,
    { signal: params.signal },
  );

  if (!response.ok) {
    throw await readError(response, 'Could not load specialities.');
  }
  return response.json();
}

export async function getFamilyMembersApi(
  userId: string,
): Promise<FamilyMember[]> {
  const response = await fetch(
    `${API_BASE}/consultation/family-members?userId=${encodeURIComponent(userId)}`,
  );

  if (!response.ok) {
    throw await readError(response, 'Could not load family members.');
  }
  return response.json();
}

export async function createFamilyMemberApi(
  userId: string,
  payload: CreateFamilyMemberPayload,
): Promise<FamilyMember> {
  const response = await fetch(
    `${API_BASE}/consultation/family-members?userId=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw await readError(response, 'Could not add family member.');
  }
  return response.json();
}

export async function createIntakeApi(
  userId: string,
  payload: CreateIntakePayload,
): Promise<ConsultationIntake> {
  const response = await fetch(
    `${API_BASE}/consultation/intake?userId=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw await readError(response, 'Could not save your consultation details.');
  }
  return response.json();
}

export async function uploadConsultationAttachmentApi(
  userId: string,
  file: File,
): Promise<UploadedAttachment> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE}/consultation/attachments?userId=${encodeURIComponent(userId)}`,
    { method: 'POST', body: formData },
  );

  if (!response.ok) {
    throw await readError(response, `Could not upload ${file.name}.`);
  }
  return response.json();
}

/** Default address first (the addresses API already orders it that way). */
export async function getPrimaryAddressApi(
  userId: string,
): Promise<SavedAddress | null> {
  const response = await fetch(
    `${API_BASE}/addresses?userId=${encodeURIComponent(userId)}`,
  );

  if (!response.ok) {
    throw await readError(response, 'Could not load your address.');
  }
  const addresses: SavedAddress[] = await response.json();
  return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
}

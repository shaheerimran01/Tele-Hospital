// Lab dashboard: this lab's prices and availability for the master catalog
// (apps/api: /lab-pricing, LabPackagePrice table)

import { API_BASE } from './lab-tests';
import { clearLabSession, labAuthHeader } from './lab-portal';

export interface LabPricingItem {
  id: string;
  title: string;
  code: string | null;
  itemType: 'PACKAGE' | 'INDIVIDUAL_TEST';
  category: string | null;
  group: string | null;
  groupLabel: string | null;
  badgeText: string | null;
  aliases: string[];
  totalTestsCount: number;
  /** sub-test names (multi-test packages only) */
  subTests: string[];
  master: { basePrice: number; discountPrice: number | null };
  custom: { basePrice: number | null; discountPrice: number | null };
  hasCustomPrice: boolean;
  effective: { basePrice: number; price: number; discountPercent: number };
  isAvailable: boolean;
  disabledSubTests: string[];
  isActiveInCatalog: boolean;
  updatedAt: string | null;
}

export interface LabPricingResponse {
  laboratory: { id: string; name: string; logoUrl: string | null; verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'; isVerified: boolean };
  summary: Record<string, number>;
  groups: { key: string; label: string; count: number }[];
  items: LabPricingItem[];
}

export interface UpdateLabPriceBody {
  laboratoryId: string;
  /** null = back to the master price */
  customBasePrice?: number | null;
  customDiscountPrice?: number | null;
  isAvailable?: boolean;
  disabledSubTests?: string[];
}

export class LabPricingError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...labAuthHeader(), ...init?.headers } });
  } catch {
    throw new LabPricingError('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) clearLabSession();
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new LabPricingError(message || 'Something went wrong. Please try again.', res.status);
  }
  return data as T;
}

export const getLabPricingApi = (laboratoryId: string) =>
  request<LabPricingResponse>(`/lab-pricing/items?laboratoryId=${encodeURIComponent(laboratoryId)}`);

export const updateLabPriceApi = (labPackageId: string, body: UpdateLabPriceBody) =>
  request<LabPricingItem>(`/lab-pricing/items/${encodeURIComponent(labPackageId)}`, { method: 'PATCH', body: JSON.stringify(body) });

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());

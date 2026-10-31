// Lab tests & health packages (apps/api: /lab-tests, LabPackage table)

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

export type LabItemType = 'PACKAGE' | 'INDIVIDUAL_TEST';
export type LabTypeFilter = 'ALL' | LabItemType;
export type LabSort = 'popular' | 'price-asc' | 'price-desc';

export interface LabCategoryCard {
  key: string;
  label: string;
  description: string;
  count: number;
  packages: number;
  tests: number;
  /** lowest price in the card */
  fromPrice: number | null;
}

export interface LabSection {
  id: string;
  title: string;
  /** "X Rays, Scans & More": its own page with every category of the target section */
  shortcut: (Omit<LabCategoryCard, 'key'> & { key: string; targetSectionId: string }) | null;
  cards: LabCategoryCard[];
}

export interface LabCatalog {
  sections: LabSection[];
  totals: { all: number; packages: number; tests: number };
}

export interface LabItem {
  id: string;
  slug: string;
  title: string;
  code: string | null;
  itemType: LabItemType;
  category: string | null;
  /** the category card it belongs to */
  group: string | null;
  badgeText: string | null;
  /** what the patient pays */
  price: number;
  /** price before the discount */
  mrp: number;
  discountPercent: number;
  totalTestsCount: number;
  listedTestsCount: number;
  testsPreview: string[];
  reportTime: string | null;
  sampleRequired: string | null;
  preparation: string | null;
  /** MALE / FEMALE when the item is for one gender */
  targetGender: string | null;
  isPopular: boolean;
  /** approved partner labs offering it and their lowest price (null when none) */
  labOffer: { labsCount: number; fromPrice: number | null };
}

export interface LabTestGroup {
  name: string;
  count: number;
  tests: string[];
}

export interface LabItemDetails extends LabItem {
  aliases: string[];
  overview: string | null;
  whyBooked: string | null;
  whatItMeasures: string | null;
  notes: string | null;
  faqs: { question: string; answer: string }[];
  /** a package's tests grouped into panels (CBC, LFT, KFT, ...) */
  testGroups: LabTestGroup[];
  tests: string[];
}

export interface LabListResponse {
  group: { key: string; label: string } | null;
  search: string | null;
  type: LabItemType | null;
  counts: { all: number; packages: number; tests: number };
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  items: LabItem[];
}

export class LabApiError extends Error {}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  } catch {
    throw new LabApiError('Could not reach the server. Check your internet connection and try again.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new LabApiError(message || 'Could not load lab tests. Please try again.');
  }
  return res.json();
}

export const getLabCatalogApi = () => get<LabCatalog>('/lab-tests/catalog');

export function getLabItemsApi(opts: { group?: string; type?: LabTypeFilter; search?: string; sort?: LabSort; page?: number; pageSize?: number }) {
  const q = new URLSearchParams();
  if (opts.group) q.set('group', opts.group);
  if (opts.type && opts.type !== 'ALL') q.set('type', opts.type);
  if (opts.search?.trim()) q.set('search', opts.search.trim());
  if (opts.sort) q.set('sort', opts.sort);
  if (opts.page) q.set('page', String(opts.page));
  if (opts.pageSize) q.set('pageSize', String(opts.pageSize));
  return get<LabListResponse>(`/lab-tests?${q.toString()}`);
}

export const getLabItemApi = (slug: string) => get<LabItemDetails>(`/lab-tests/${encodeURIComponent(slug)}`);

// ---------------------------------------------------------------------------
// Partner labs for one test / package (GET /patient/labs-for-test)
// ---------------------------------------------------------------------------

export interface LabPartnerBranch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  isMainCenter: boolean;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
}

export interface LabPartner {
  laboratoryId: string;
  labName: string;
  logoUrl: string | null;
  offeredPrice: number;
  originalPrice: number;
  discountPercent: number;
  hasHomeSample: boolean;
  homeSampleFee: number | null;
  /** package tests this lab does not perform */
  unavailableTests: string[];
  nearestBranch: { id: string; name: string; address: string; distanceKm: number | null };
  branches: LabPartnerBranch[];
}

export interface LabsForTestResponse {
  success: boolean;
  item: { id: string; title: string; itemType: LabItemType; totalTestsCount: number; masterPrice: { offeredPrice: number; originalPrice: number } };
  sortedBy: 'distance' | 'price';
  data: LabPartner[];
}

export function getLabsForTestApi(labPackageId: string, near?: { lat: number; lng: number } | null) {
  const q = new URLSearchParams({ labPackageId });
  if (near) {
    q.set('userLat', near.lat.toFixed(5));
    q.set('userLng', near.lng.toFixed(5));
  }
  return get<LabsForTestResponse>(`/patient/labs-for-test?${q.toString()}`);
}

/** "/uploads/labs/..." -> absolute URL on the API server */
export const apiFileUrl = (path: string | null | undefined) => (!path ? null : /^https?:/i.test(path) ? path : `${API_BASE}${path}`);

/** 0.4 -> "400 m", 2.37 -> "2.4 km" */
export const formatKm = (km: number) => (km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`);

export const formatPkr = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-PK')}`;

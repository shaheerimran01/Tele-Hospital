// Lab tests & health packages (apps/api: /lab-tests, LabPackage table)

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

export const formatPkr = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-PK')}`;

import {
  AdminPharmacyProductCounts,
  AdminPharmacyProductItem,
  AdminPharmacyProductResponse,
  ProductTypeFilter,
  SyncResult,
} from '@/types/pharmacyProduct';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type PharmacyProductFilters = {
  pharmacyId?: string;
  type?: ProductTypeFilter;
  search?: string;
  limit?: number;
  offset?: number;
};

type RawCatalogDetails = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  genericName?: string | null;
  brandName?: string | null;
  category?: string | null;
  subCategory?: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

type RawMatchedProduct = { id: string; name: string; slug: string };

type RawPharmacyProduct = {
  id: string;
  pharmacyId: string;
  pharmacy?: { name?: string | null } | null;
  pharmacyName?: string | null;
  productId?: string | null;
  sku?: string | null;
  price?: number | string | null;
  mrp?: number | string | null;
  stock?: number | null;
  isAvailable?: boolean | null;
  approvalStatus?: string | null;
  matchStatus?: string | null;
  normalizedKey?: string | null;
  groupSize?: number | null;
  isRepresentative?: boolean | null;
  duplicateOf?: { id: string; name: string; pharmacyName: string } | null;
  catalogMatch?: (RawMatchedProduct & { exact?: boolean }) | null;
  createdAt?: string | null;
  product?: RawCatalogDetails | null;
};

type RawAdminResponse = {
  success?: boolean;
  filters?: { type?: string; pharmacyId?: string | null; search?: string | null };
  totalCount?: number;
  counts?: Partial<AdminPharmacyProductCounts>;
  products?: RawPharmacyProduct[];
  limit?: number;
  offset?: number;
};

// Seller uploads waiting for admin review (All / Unique / Similar)
export async function fetchAdminPharmacyProducts(
  filters: PharmacyProductFilters,
): Promise<AdminPharmacyProductResponse> {
  const params = new URLSearchParams();

  if (filters.pharmacyId) params.set('pharmacyId', filters.pharmacyId);
  if (filters.type) params.set('type', filters.type);
  if (filters.search) params.set('search', filters.search);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  const res = await fetch(`${API_BASE_URL}/admin/pharmacy-products?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Pharmacy products fetch nahi ho saken.');
  }

  const raw = (await res.json()) as RawAdminResponse;

  const products: AdminPharmacyProductItem[] = Array.isArray(raw?.products)
    ? raw.products.map((item) => ({
        id: item.id,
        pharmacyId: item.pharmacyId,
        pharmacyName: item.pharmacy?.name || item.pharmacyName || 'Unknown Pharmacy',
        productId: item.productId ?? null,
        sku: item.sku || null,
        price: Number(item.price ?? 0),
        mrp: item.mrp === null || item.mrp === undefined ? null : Number(item.mrp),
        stock: Number(item.stock ?? 0),
        isAvailable: Boolean(item.isAvailable),
        approvalStatus: (item.approvalStatus || 'PENDING') as AdminPharmacyProductItem['approvalStatus'],
        matchStatus: (item.matchStatus || 'UNIQUE') as AdminPharmacyProductItem['matchStatus'],
        normalizedKey: item.normalizedKey || '',
        groupSize: Number(item.groupSize ?? 1),
        isRepresentative: item.isRepresentative !== false,
        duplicateOf: item.duplicateOf ?? null,
        catalogMatch: item.catalogMatch
          ? { ...item.catalogMatch, exact: item.catalogMatch.exact !== false }
          : null,
        createdAt: item.createdAt ?? '',
        product: {
          id: item.product?.id ?? null,
          name: item.product?.name || 'Unnamed Medicine',
          slug: item.product?.slug || '',
          genericName: item.product?.genericName || 'N/A',
          brandName: item.product?.brandName || 'N/A',
          category: item.product?.category || 'General Pharmacy',
          subCategory: item.product?.subCategory || 'N/A',
          description: item.product?.description || 'N/A',
          imageUrl: item.product?.imageUrl || null,
        },
      }))
    : [];

  return {
    success: Boolean(raw?.success),
    filters: {
      type: raw?.filters?.type ?? filters.type ?? 'all',
      pharmacyId: raw?.filters?.pharmacyId ?? null,
      search: raw?.filters?.search ?? null,
    },
    totalCount: Number(raw?.totalCount ?? 0),
    counts: {
      all: Number(raw?.counts?.all ?? 0),
      unique: Number(raw?.counts?.unique ?? 0),
      similar: Number(raw?.counts?.similar ?? 0),
      synced: Number(raw?.counts?.synced ?? 0),
      pending: Number(raw?.counts?.pending ?? 0),
      local: Number(raw?.counts?.local ?? 0),
      linked: Number(raw?.counts?.linked ?? 0),
    },
    products,
    limit: Number(raw?.limit ?? 50),
    offset: Number(raw?.offset ?? 0),
  };
}

// Push the selected seller offers into the global Product catalog
export async function syncPharmacyProductsToCatalog(
  productIds: string[],
  forceCreateNew = false,
): Promise<SyncResult> {
  const res = await fetch(`${API_BASE_URL}/admin/pharmacy-products/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds, forceCreateNew }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Sync fail ho gaya.',
    );
  }

  return data as SyncResult;
}
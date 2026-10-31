import {
  CatalogActionResult,
  CatalogStatusFilter,
  GlobalCatalogItem,
  GlobalCatalogResponse,
} from '@/types/globalCatalog';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

type RawGlobalCatalogItem = Omit<GlobalCatalogItem, 'pharmacies'> & {
  /** Older responses only carried isActive. */
  isActive?: boolean | null;
  totalStock?: number | null;
  /** Raw payloads may send pharmacy objects instead of names. */
  pharmacies?: Array<{ name: string } | string> | null;
  nameVariants?: string[] | null;
  unlinkedMatches?: GlobalCatalogItem['unlinkedMatches'] | null;
};

type RawGlobalCatalogResponse = {
  success?: boolean;
  totalCount?: number;
  counts?: Partial<GlobalCatalogResponse['counts']>;
  products?: RawGlobalCatalogItem[] | null;
  limit?: number;
  offset?: number;
};

async function readError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (data?.message) return data.message;
  } catch {
    // fall through to the generic message
  }
  return fallback;
}

// Published catalog + adoption stats
export async function fetchGlobalCatalog(filters: {
  search?: string;
  status?: CatalogStatusFilter;
  limit?: number;
  offset?: number;
}): Promise<GlobalCatalogResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  const res = await fetch(`${API_BASE_URL}/admin/global-catalog?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(await readError(res, 'Catalog fetch nahi ho saken.'));
  }

  const raw = (await res.json()) as RawGlobalCatalogResponse;

  const products: GlobalCatalogItem[] = Array.isArray(raw?.products)
    ? raw.products.map((item) => ({
        ...item,
        isPublished: item.isPublished ?? item.isActive === true,
        totalStock: Number(item.totalStock ?? 0),
        pharmacies: (item.pharmacies ?? [])
          .map((pharmacy) => (typeof pharmacy === 'string' ? pharmacy : pharmacy?.name))
          .filter((name): name is string => Boolean(name)),
        nameVariants: item.nameVariants ?? [],
        unlinkedMatchCount: Number(item.unlinkedMatchCount ?? 0),
        unlinkedMatches: item.unlinkedMatches ?? [],
      }))
    : [];

  return {
    success: Boolean(raw?.success),
    totalCount: Number(raw?.totalCount ?? 0),
    counts: {
      all: Number(raw?.counts?.all ?? 0),
      published: Number(raw?.counts?.published ?? 0),
      unpublished: Number(raw?.counts?.unpublished ?? 0),
    },
    products,
    limit: Number(raw?.limit ?? 50),
    offset: Number(raw?.offset ?? 0),
  };
}

// Link one uploaded offer to an existing catalog item (merges duplicates of that pharmacy)
export async function adoptOfferIntoProduct(
  productId: string,
  pharmacyProductId: string,
): Promise<CatalogActionResult> {
  const res = await fetch(`${API_BASE_URL}/admin/global-catalog/${productId}/adopt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pharmacyProductId }),
  });

  if (!res.ok) throw new Error(await readError(res, 'Adopt fail ho gaya.'));
  return (await res.json()) as CatalogActionResult;
}

// Publish one uploaded offer: reuses the catalog item with the same normalized key, or creates it
export async function publishOffer(
  pharmacyProductId: string,
  forceCreateNew = false,
): Promise<CatalogActionResult> {
  const res = await fetch(`${API_BASE_URL}/admin/global-catalog/publish-offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pharmacyProductId, forceCreateNew }),
  });

  if (!res.ok) throw new Error(await readError(res, 'Publish fail ho gaya.'));
  return (await res.json()) as CatalogActionResult;
}

export async function setProductPublication(
  productId: string,
  isActive: boolean,
): Promise<CatalogActionResult> {
  const res = await fetch(`${API_BASE_URL}/admin/global-catalog/${productId}/publication`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });

  if (!res.ok) throw new Error(await readError(res, 'Update fail ho gaya.'));
  return (await res.json()) as CatalogActionResult;
}

export async function deleteCatalogProduct(productId: string): Promise<CatalogActionResult> {
  const res = await fetch(`${API_BASE_URL}/admin/global-catalog/${productId}`, {
    method: 'DELETE',
  });

  if (!res.ok) throw new Error(await readError(res, 'Delete fail ho gaya.'));
  return (await res.json()) as CatalogActionResult;
}
export type GlobalCatalogUnlinkedMatch = {
  id: string;
  name: string | null;
  pharmacyName: string;
  price: number | null;
  mrp: number | null;
  stock: number;
  brandName: string | null;
  category: string | null;
  imageUrl: string | null;
  sku: string | null;
  isAvailable: boolean;
};

export type GlobalCatalogItem = {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  genericName: string | null;
  category: string | null;
  subCategory: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  price: number | null;
  mrp: number | null;
  normalizedKey: string;
  offerCount: number;
  pharmacyCount: number;
  pharmacies: string[];
  totalStock: number;
  availableOfferCount: number;
  pendingReviewCount: number;
  /** Uploaded spellings that normalized onto this item. */
  nameVariants: string[];
  /** Uploads that look like this item but were never linked to it. */
  unlinkedMatchCount: number;
  unlinkedMatches: GlobalCatalogUnlinkedMatch[];
  createdAt: string;
  updatedAt: string;
};

export type CatalogStatusFilter = 'all' | 'published' | 'unpublished';

export type GlobalCatalogResponse = {
  success: boolean;
  filters?: { search: string | null; status: string };
  totalCount: number;
  counts: { all: number; published: number; unpublished: number };
  products: GlobalCatalogItem[];
  limit: number;
  offset: number;
};

export type CatalogActionResult = {
  success: boolean;
  message: string;
  created?: boolean;
  merged?: boolean;
  offerId?: string;
  removedOffers?: number;
  product?: { id: string; name: string; slug?: string; isPublished?: boolean };
};
export type MatchStatus = 'UNIQUE' | 'SIMILAR';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ProductTypeFilter = 'all' | 'unique' | 'similar' | 'local' | 'linked';

export type CatalogMatch = {
  id: string;
  name: string;
  slug: string;
  /** false when matched through the normalized key instead of the exact name. */
  exact: boolean;
};

export type CatalogDetails = {
  id: string | null;
  name: string;
  slug: string;
  genericName: string | null;
  brandName: string | null;
  category: string | null;
  subCategory: string | null;
  description: string | null;
  imageUrl: string | null;
};

export type AdminPharmacyProductItem = {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  productId: string | null;
  sku: string | null;
  price: number;
  mrp: number | null;
  stock: number;
  isAvailable: boolean;
  approvalStatus: ApprovalStatus;
  /** UNIQUE = representative of its cluster, SIMILAR = duplicate inside the same cluster. */
  matchStatus: MatchStatus;
  /** Brand + core name + volume: the value the product is clustered by. */
  normalizedKey: string;
  groupSize: number;
  isRepresentative: boolean;
  duplicateOf: { id: string; name: string; pharmacyName: string } | null;
  catalogMatch: CatalogMatch | null;
  createdAt: string;
  product: CatalogDetails;
};

export type AdminPharmacyProductCounts = {
  all: number;
  unique: number;
  similar: number;
  synced: number;
  pending: number;
  /** Offers with no global catalog link yet. */
  local: number;
  /** Offers already linked to a global catalog item. */
  linked: number;
};

export type AdminPharmacyProductResponse = {
  success: boolean;
  filters: { type: string; pharmacyId: string | null; search: string | null };
  totalCount: number;
  counts: AdminPharmacyProductCounts;
  products: AdminPharmacyProductItem[];
  limit: number;
  offset: number;
};

export type SyncResult = {
  success: boolean;
  message: string;
  stats: {
    requested: number;
    syncedCount: number;
    skippedCount: number;
    errorCount: number;
  };
  errors: Array<{ id: string; reason: string }>;
};
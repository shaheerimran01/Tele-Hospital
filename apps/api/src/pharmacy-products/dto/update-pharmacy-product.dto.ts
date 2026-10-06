import { CreatePharmacyProductDto } from './create-pharmacy-product.dto.js';

/**
 * Payload for updating an existing PharmacyProduct.
 *
 * `isActive` / `isAvailable` always map to `PharmacyProduct.isAvailable` (the store
 * level availability), never to the global `Product.isActive` catalog flag, so that a
 * single seller can never take a catalog item offline for every other seller.
 */
export class UpdatePharmacyProductDto implements Partial<CreatePharmacyProductDto> {
  name?: string;
  slug?: string;
  genericName?: string;
  brandName?: string;
  category?: string;
  subCategory?: string;
  systemOfMedicine?: string;
  description?: string;
  uses?: string;
  benefits?: string;
  sideEffects?: string;
  howToUse?: string;
  storage?: string;
  imageUrl?: string;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  manufacturer?: string;
  healthConditions?: string | string[];
  ingredients?: string | string[];
  tags?: string | string[];
  prescriptionRequired?: boolean;
  isFeatured?: boolean;

  price?: number | string;
  originalPrice?: number | string | null;
  mrp?: number | string | null;
  discount?: number | string | null;
  stock?: number | string;
  sku?: string;
  isActive?: boolean;
  isAvailable?: boolean;
}
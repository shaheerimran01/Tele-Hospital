/**
 * Payload for creating a single PharmacyProduct (store specific offer) from the seller portal.
 * Numeric fields accept numbers as well as strings because the portal form submits
 * every input as a string.
 */
export class CreatePharmacyProductDto {
  // Catalog (Product) details
  name: string;
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

  // Inventory (PharmacyProduct) details
  price: number | string;
  originalPrice?: number | string | null;
  mrp?: number | string | null;
  discount?: number | string | null;
  stock?: number | string;
  sku?: string;
  isActive?: boolean;
  isAvailable?: boolean;
}
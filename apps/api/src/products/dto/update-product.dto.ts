import { CreateProductDto } from './create-product.dto.js';

export class UpdateProductDto implements Partial<CreateProductDto> {
  name?: string;
  slug?: string;
  genericName?: string;
  brandName?: string;
  price?: number;
  originalPrice?: number;
  description?: string;
  uses?: string;
  benefits?: string;
  sideEffects?: string;
  howToUse?: string;
  working?: string;
  safetyAdvice?: string;
  quickTips?: string;
  storage?: string;
  category?: string;
  subCategory?: string;
  systemOfMedicine?: string;
  healthConditions?: string[];
  ingredients?: string[];
  tags?: string[];
  isFeatured?: boolean;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  manufacturer?: string;
  prescriptionRequired?: boolean;
  imageUrl?: string;
  isActive?: boolean;
}
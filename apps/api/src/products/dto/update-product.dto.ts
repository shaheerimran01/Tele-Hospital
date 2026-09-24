export class UpdateProductDto {
  name?: string;
  slug?: string;

  genericName?: string;
  brandName?: string;

  description?: string;

  category?: string;
  subCategory?: string;

  dosageForm?: string;
  strength?: string;
  packSize?: string;

  manufacturer?: string;

  prescriptionRequired?: boolean;

  imageUrl?: string;

  isActive?: boolean;
}
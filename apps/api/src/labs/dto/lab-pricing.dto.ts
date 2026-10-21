import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MAX_PRICE_PKR = 10_000_000;

/** GET /lab-pricing/items?laboratoryId= */
export class LabPricingQueryDto {
  @IsUUID('4', { message: 'laboratoryId must be a valid lab ID.' })
  laboratoryId!: string;
}

/**
 * PATCH /lab-pricing/items/:labPackageId
 * Every field is optional: undefined = keep as is, null = back to the master price.
 * Prices are whole rupees. A discounted price needs a custom base price.
 */
export class UpdateLabPriceDto {
  @IsUUID('4', { message: 'laboratoryId must be a valid lab ID.' })
  laboratoryId!: string;

  @IsOptional()
  @IsInt({ message: 'Base price must be a whole number of rupees.' })
  @Min(1, { message: 'Base price must be at least Rs. 1.' })
  @Max(MAX_PRICE_PKR, { message: 'Base price is too high.' })
  customBasePrice?: number | null;

  @IsOptional()
  @IsInt({ message: 'Discounted price must be a whole number of rupees.' })
  @Min(1, { message: 'Discounted price must be at least Rs. 1.' })
  @Max(MAX_PRICE_PKR, { message: 'Discounted price is too high.' })
  customDiscountPrice?: number | null;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? [...new Set(value.map((v) => (typeof v === 'string' ? v.trim() : v)))] : value))
  disabledSubTests?: string[];
}

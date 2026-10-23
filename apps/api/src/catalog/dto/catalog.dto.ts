import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CATALOG_ITEM_TYPES = ['PACKAGE', 'INDIVIDUAL_TEST'] as const;
export type CatalogItemType = (typeof CATALOG_ITEM_TYPES)[number];

const optionalText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;
const requiredText = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListCatalogItemsQueryDto {
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(CATALOG_ITEM_TYPES)
  itemType?: CatalogItemType;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CreateCatalogItemDto {
  @Transform(requiredText)
  @IsString()
  @IsNotEmpty({ message: 'Item title is required' })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsIn(CATALOG_ITEM_TYPES)
  itemType: CatalogItemType;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(120)
  category?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Base price must be a number' })
  @Min(0)
  basePrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Discount price must be a number' })
  @Min(0)
  discountPrice?: number;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value.map((test) => String(test).trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  testsIncluded?: string[];

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(100)
  reportTime?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCatalogItemDto {
  @IsOptional()
  @Transform(requiredText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsIn(CATALOG_ITEM_TYPES)
  itemType?: CatalogItemType;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPrice?: number | null;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value.map((test) => String(test).trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  testsIncluded?: string[];

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(100)
  reportTime?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

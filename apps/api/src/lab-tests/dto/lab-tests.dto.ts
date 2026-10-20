import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ALL_CARDS, ITEM_TYPES } from '../lab-catalog.js';

const optionalText = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

export const LAB_SORTS = ['popular', 'price-asc', 'price-desc'] as const;

/** GET /lab-tests?group=&type=&search=&sort=&page=&pageSize= */
export class ListLabItemsQueryDto {
  /** a category card, e.g. "full-body" or "x-ray" */
  @IsOptional()
  @Transform(optionalText)
  @IsIn(ALL_CARDS.map((c) => c.key), { message: 'Unknown test category' })
  group?: string;

  /** PACKAGE or INDIVIDUAL_TEST (all when left out) */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || undefined : value))
  @IsIn(ITEM_TYPES, { message: 'type must be PACKAGE or INDIVIDUAL_TEST' })
  type?: (typeof ITEM_TYPES)[number];

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(optionalText)
  @IsIn(LAB_SORTS, { message: `sort must be one of: ${LAB_SORTS.join(', ')}` })
  sort?: (typeof LAB_SORTS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  pageSize?: number;
}

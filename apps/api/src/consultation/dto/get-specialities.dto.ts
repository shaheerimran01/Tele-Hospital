import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Query params for GET /consultation/specialities
 *   ?search=derma      -> case-insensitive match on name / description
 *   ?category=General  -> exact (case-insensitive) category match
 */
export class GetSpecialitiesDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  category?: string;
}

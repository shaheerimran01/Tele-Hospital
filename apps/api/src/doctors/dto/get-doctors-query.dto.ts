import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DoctorStatus } from '../../generated/prisma/enums.js';

const trimOrUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? undefined : v;
};

export const DOCTOR_STATUS_FILTERS = [...Object.values(DoctorStatus), 'ALL'] as const;
export const CONSULTATION_TYPE_FILTERS = ['VIDEO', 'TEXT', 'IN_CLINIC'] as const;

/**
 * GET /doctors query params
 *
 *   speciality        Speciality name, slug or id (e.g. "Dermatologist", "dermatologist")
 *   status            PENDING | APPROVED | REJECTED | ALL   (default APPROVED)
 *   search            Matches name, degrees and title
 *   city              Matches clinic address text (e.g. "Lahore")
 *   lat, lng, radiusKm  Only doctors with a clinic within radiusKm (default 10 km), sorted by distance
 *   consultationType  VIDEO | TEXT | IN_CLINIC
 *   page, limit       Pagination (default page 1, limit 50, max 100)
 */
export class GetDoctorsQueryDto {
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(100)
  speciality?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(DOCTOR_STATUS_FILTERS, {
    message: `status must be one of: ${DOCTOR_STATUS_FILTERS.join(', ')}`,
  })
  status?: (typeof DOCTOR_STATUS_FILTERS)[number];

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(100)
  city?: string;

  // Location range (both lat and lng are required together)
  @ValidateIf((o: GetDoctorsQueryDto) => o.lng !== undefined || o.lat !== undefined)
  @Type(() => Number)
  @IsNumber({}, { message: 'lat must be a number (send lat and lng together)' })
  @Min(-90)
  @Max(90)
  lat?: number;

  @ValidateIf((o: GetDoctorsQueryDto) => o.lat !== undefined || o.lng !== undefined)
  @Type(() => Number)
  @IsNumber({}, { message: 'lng must be a number (send lat and lng together)' })
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(200)
  radiusKm?: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(CONSULTATION_TYPE_FILTERS, {
    message: `consultationType must be one of: ${CONSULTATION_TYPE_FILTERS.join(', ')}`,
  })
  consultationType?: (typeof CONSULTATION_TYPE_FILTERS)[number];

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
  limit?: number;
}

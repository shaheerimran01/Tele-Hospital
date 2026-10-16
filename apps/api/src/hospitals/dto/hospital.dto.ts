import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Values accepted for Hospital.emergency */
export const HOSPITAL_EMERGENCY = ['24/7', 'Available', 'Daytime'] as const;
export type HospitalEmergency = (typeof HOSPITAL_EMERGENCY)[number];

/** "" -> undefined, other text trimmed */
const optionalText = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);
const requiredText = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** "" / null -> undefined, numbers kept, numeric strings converted */
const optionalNumber = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : value;
};

/**
 * GET /hospitals/nearby
 *
 *   intakeId, userId   Consultation request: supplies the patient's saved location (and speciality)
 *   latitude, longitude  Override the patient location (send both together)
 *   radius             Only hospitals within this many km (default: no limit)
 *   limit              Max hospitals returned (default 50, max 200)
 */
export class NearbyHospitalsQueryDto {
  @IsOptional()
  @IsUUID('all', { message: 'intakeId must be a valid id' })
  intakeId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @ValidateIf((o: NearbyHospitalsQueryDto) => o.latitude !== undefined || o.longitude !== undefined)
  @Type(() => Number)
  @IsNumber({}, { message: 'latitude must be a number (send latitude and longitude together)' })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ValidateIf((o: NearbyHospitalsQueryDto) => o.latitude !== undefined || o.longitude !== undefined)
  @Type(() => Number)
  @IsNumber({}, { message: 'longitude must be a number (send latitude and longitude together)' })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'radius must be a number of kilometres' })
  @Min(0.5)
  @Max(1000)
  radius?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

/** GET /admin/hospitals?search=&page=&pageSize= */
export class ListHospitalsQueryDto {
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(120)
  search?: string;

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

/** POST /admin/hospitals */
export class CreateHospitalDto {
  @Transform(requiredText)
  @IsString()
  @IsNotEmpty({ message: 'Hospital name is required' })
  @MaxLength(200, { message: 'Hospital name can be at most 200 characters' })
  name: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(120, { message: 'City / area can be at most 120 characters' })
  city?: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(60, { message: 'Type can be at most 60 characters' })
  type?: string;

  @Transform(requiredText)
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(500, { message: 'Address can be at most 500 characters' })
  address: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(60, { message: 'Contact can be at most 60 characters' })
  contact?: string;

  @IsOptional()
  @Transform(optionalNumber)
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude?: number;

  @IsOptional()
  @Transform(optionalNumber)
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude?: number;

  @IsOptional()
  @Transform(optionalText)
  @IsIn(HOSPITAL_EMERGENCY, { message: `Emergency must be one of: ${HOSPITAL_EMERGENCY.join(', ')}` })
  emergency?: HospitalEmergency;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(2000, { message: 'Notes can be at most 2000 characters' })
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * PATCH /admin/hospitals/:id: same fields, all optional. Sending null (or "")
 * for an optional field clears it.
 */
export class UpdateHospitalDto {
  @IsOptional()
  @Transform(requiredText)
  @IsString()
  @IsNotEmpty({ message: 'Hospital name is required' })
  @MaxLength(200, { message: 'Hospital name can be at most 200 characters' })
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @ValidateIf((_: unknown, v: unknown) => v !== null)
  @IsString()
  @MaxLength(120, { message: 'City / area can be at most 120 characters' })
  city?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @ValidateIf((_: unknown, v: unknown) => v !== null)
  @IsString()
  @MaxLength(60, { message: 'Type can be at most 60 characters' })
  type?: string | null;

  @IsOptional()
  @Transform(requiredText)
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(500, { message: 'Address can be at most 500 characters' })
  address?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @ValidateIf((_: unknown, v: unknown) => v !== null)
  @IsString()
  @MaxLength(60, { message: 'Contact can be at most 60 characters' })
  contact?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : optionalNumber({ value }) ?? value))
  @ValidateIf((_: unknown, v: unknown) => v !== null)
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude?: number | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : optionalNumber({ value }) ?? value))
  @ValidateIf((_: unknown, v: unknown) => v !== null)
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude?: number | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @ValidateIf((_: unknown, v: unknown) => v !== null)
  @IsIn(HOSPITAL_EMERGENCY, { message: `Emergency must be one of: ${HOSPITAL_EMERGENCY.join(', ')}` })
  emergency?: HospitalEmergency | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @ValidateIf((_: unknown, v: unknown) => v !== null)
  @IsString()
  @MaxLength(2000, { message: 'Notes can be at most 2000 characters' })
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

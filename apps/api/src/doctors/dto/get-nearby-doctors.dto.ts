import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export const NEARBY_SERVICE_MODES = ['IN_CLINIC', 'VIDEO', 'TEXT'] as const;
export type NearbyServiceMode = (typeof NEARBY_SERVICE_MODES)[number];

/**
 * GET /doctors/nearby
 *
 *   intakeId          Consultation intake: supplies the patient's location and speciality
 *   userId            Owner of the intake (same convention as the consultation API)
 *   specialityId      Overrides the intake's speciality
 *   allSpecialities   true -> ignore speciality and list every approved doctor
 *   lat, lng          Override the patient location (both required together)
 *   serviceMode       IN_CLINIC | VIDEO | TEXT
 *   radiusKm          Only doctors with a clinic within this distance (default: no limit)
 *   limit             Max doctors returned (default 50, max 100)
 */
export class GetNearbyDoctorsDto {
  @IsOptional()
  @IsUUID('all', { message: 'intakeId must be a valid id' })
  intakeId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  specialityId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  allSpecialities?: boolean;

  @ValidateIf((o: GetNearbyDoctorsDto) => o.lat !== undefined || o.lng !== undefined)
  @Type(() => Number)
  @IsNumber({}, { message: 'lat must be a number (send lat and lng together)' })
  @Min(-90)
  @Max(90)
  lat?: number;

  @ValidateIf((o: GetNearbyDoctorsDto) => o.lat !== undefined || o.lng !== undefined)
  @Type(() => Number)
  @IsNumber({}, { message: 'lng must be a number (send lat and lng together)' })
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(NEARBY_SERVICE_MODES, {
    message: `serviceMode must be one of: ${NEARBY_SERVICE_MODES.join(', ')}`,
  })
  serviceMode?: NearbyServiceMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(500)
  radiusKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

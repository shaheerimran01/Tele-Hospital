import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ConsultationServiceMode } from '../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export const SERVICE_MODES = Object.values(ConsultationServiceMode);
export const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** GET /appointments/available-slots */
export class GetSlotsDto {
  @Transform(trim)
  @IsUUID('all', { message: 'doctorId must be a valid id' })
  doctorId: string;

  @Transform(upper)
  @IsIn(SERVICE_MODES, { message: `serviceMode must be one of: ${SERVICE_MODES.join(', ')}` })
  serviceMode: ConsultationServiceMode;

  @IsOptional()
  @Transform(trim)
  @IsUUID('all', { message: 'clinicId must be a valid id' })
  clinicId?: string;

  @Transform(trim)
  @Matches(DATE_REGEX, { message: 'date must be in YYYY-MM-DD format' })
  date: string;
}

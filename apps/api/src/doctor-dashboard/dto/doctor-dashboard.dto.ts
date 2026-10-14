import { IsIn, IsNotEmpty, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeTime, TIME_FORMAT_REGEX } from '../../doctors/dto/register-doctor.dto.js';
import { DATE_REGEX } from '../../appointments/dto/get-slots.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

/** What a doctor can do from the dashboard. */
export const DOCTOR_ACTION_STATUSES = ['CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
export type DoctorActionStatus = (typeof DOCTOR_ACTION_STATUSES)[number];

export class DoctorAppointmentStatusDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(DOCTOR_ACTION_STATUSES, { message: `status must be one of: ${DOCTOR_ACTION_STATUSES.join(', ')}` })
  status: DoctorActionStatus;

  /** Required when declining; saved in Appointment.cancelReason and shared with the patient */
  @ValidateIf((o: DoctorAppointmentStatusDto) => o.status === 'CANCELLED' || o.reason !== undefined)
  @Transform(trim)
  @IsString({ message: 'Please enter a reason for declining' })
  @IsNotEmpty({ message: 'Please enter a reason for declining' })
  @MinLength(3, { message: 'Please enter a reason for declining' })
  @MaxLength(500)
  reason?: string;
}

export class DoctorRescheduleDto {
  @Transform(trim)
  @Matches(DATE_REGEX, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @Transform(({ value }) => normalizeTime(value))
  @IsString()
  @Matches(TIME_FORMAT_REGEX, { message: 'startTime must look like "10:30 AM"' })
  startTime: string;

  /** Required; saved in Appointment.cancelReason and shared with the patient */
  @Transform(trim)
  @IsString({ message: 'Please enter a reason for rescheduling' })
  @IsNotEmpty({ message: 'Please enter a reason for rescheduling' })
  @MinLength(3, { message: 'Please enter a reason for rescheduling' })
  @MaxLength(500)
  reason: string;
}

export class DoctorSlotsQueryDto {
  @Transform(trim)
  @Matches(DATE_REGEX, { message: 'date must be in YYYY-MM-DD format' })
  date: string;
}

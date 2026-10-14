import { IsIn, IsOptional, IsString, IsUUID, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ConsultationServiceMode, PatientType } from '../../generated/prisma/enums.js';
import { normalizeTime, TIME_FORMAT_REGEX } from '../../doctors/dto/register-doctor.dto.js';
import { DATE_REGEX, SERVICE_MODES } from './get-slots.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
/** Treats "" as "not sent" so optional ids can be left blank by the client. */
const optionalId = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export const PAYMENT_METHODS = ['COD', 'JAZZCASH', 'EASYPAISA', 'CARD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const PATIENT_TYPES = Object.values(PatientType);

/** POST /appointments */
export class CreateAppointmentDto {
  /** Body value; the controller prefers req.user / ?userId= when present. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  userId?: string;

  @Transform(trim)
  @IsUUID('all', { message: 'doctorId must be a valid id' })
  doctorId: string;

  @Transform(optionalId)
  @ValidateIf((o: CreateAppointmentDto) => o.serviceMode === 'IN_CLINIC' || o.clinicId !== undefined)
  @IsUUID('all', { message: 'Please choose a clinic for an in-clinic visit' })
  clinicId?: string;

  @Transform(optionalId)
  @IsOptional()
  @IsUUID('all', { message: 'intakeId must be a valid id' })
  intakeId?: string;

  @Transform(upper)
  @IsIn(PATIENT_TYPES, { message: `patientType must be one of: ${PATIENT_TYPES.join(', ')}` })
  patientType: PatientType;

  @Transform(optionalId)
  @ValidateIf((o: CreateAppointmentDto) => o.patientType === 'FAMILY_MEMBER')
  @IsUUID('all', { message: 'Please choose the family member this appointment is for' })
  familyMemberId?: string;

  @Transform(upper)
  @IsIn(SERVICE_MODES, { message: `serviceMode must be one of: ${SERVICE_MODES.join(', ')}` })
  serviceMode: ConsultationServiceMode;

  /** "YYYY-MM-DD" (a full ISO date-time is cut to its date part) */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().slice(0, 10) : value))
  @Matches(DATE_REGEX, { message: 'appointmentDate must be in YYYY-MM-DD format' })
  appointmentDate: string;

  @Transform(({ value }) => normalizeTime(value))
  @IsString()
  @Matches(TIME_FORMAT_REGEX, { message: 'startTime must look like "10:30 AM"' })
  startTime: string;

  /** Optional: the server always books one 30-minute slot and checks this matches. */
  @IsOptional()
  @Transform(({ value }) => normalizeTime(value))
  @IsString()
  @Matches(TIME_FORMAT_REGEX, { message: 'endTime must look like "11:00 AM"' })
  endTime?: string;

  @Transform(upper)
  @IsIn(PAYMENT_METHODS, { message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}` })
  paymentMethod: PaymentMethod;
}

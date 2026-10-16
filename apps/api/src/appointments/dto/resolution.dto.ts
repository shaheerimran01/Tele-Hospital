import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeTime, TIME_FORMAT_REGEX } from '../../doctors/dto/register-doctor.dto.js';
import { DATE_REGEX } from './get-slots.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
/** "" counts as "not sent" */
const optionalText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export const SERVICE_MODES = ['IN_CLINIC', 'VIDEO', 'TEXT'] as const;

/** POST /appointments/:id/forward-reschedule (admin -> patient) */
export class ForwardRescheduleDto {
  /** Optional message from the Tabibistan team, added to the patient's notification */
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(500, { message: 'The message can be at most 500 characters' })
  note?: string;
}

/**
 * - ACCEPT: approve the doctor's new time
 * - PROPOSE_SLOT: pick another time with the same doctor
 * - REQUEST_NEW_DOCTOR: cancel, and let the Tabibistan team choose another doctor
 * - CHOOSE_OWN_DOCTOR: cancel, and browse doctors to book one yourself
 */
export const PATIENT_RESPONSE_ACTIONS = ['ACCEPT', 'PROPOSE_SLOT', 'REQUEST_NEW_DOCTOR', 'CHOOSE_OWN_DOCTOR'] as const;
export type PatientResponseAction = (typeof PATIENT_RESPONSE_ACTIONS)[number];

/** PATCH /appointments/:id/patient-reschedule-response */
export class PatientRescheduleResponseDto {
  /** Body value; the controller prefers req.user / ?userId= when present. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  userId?: string;

  @Transform(upper)
  @IsIn(PATIENT_RESPONSE_ACTIONS, { message: `action must be one of: ${PATIENT_RESPONSE_ACTIONS.join(', ')}` })
  action: PatientResponseAction;

  /** PROPOSE_SLOT: the day the patient wants (YYYY-MM-DD) */
  @ValidateIf((o: PatientRescheduleResponseDto) => o.action === 'PROPOSE_SLOT')
  @Transform(trim)
  @Matches(DATE_REGEX, { message: 'Please choose a date' })
  date?: string;

  /** PROPOSE_SLOT: the time the patient wants ("10:30 AM") */
  @ValidateIf((o: PatientRescheduleResponseDto) => o.action === 'PROPOSE_SLOT')
  @Transform(({ value }) => (typeof value === 'string' ? normalizeTime(value) : value))
  @Matches(TIME_FORMAT_REGEX, { message: 'Please choose a time' })
  startTime?: string;

  /** Optional note for the doctor / the Tabibistan team */
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(500, { message: 'The note can be at most 500 characters' })
  note?: string;
}

/** POST /appointments/:id/recommend-alternative (admin -> patient) */
export class RecommendAlternativeDto {
  @Transform(trim)
  @IsUUID('all', { message: 'Please choose a doctor' })
  doctorId: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(500, { message: 'The message can be at most 500 characters' })
  note?: string;

  /** Consultation type to book with the recommended doctor (defaults to the original one) */
  @IsOptional()
  @Transform(upper)
  @IsIn(SERVICE_MODES, { message: `serviceMode must be one of: ${SERVICE_MODES.join(', ')}` })
  serviceMode?: (typeof SERVICE_MODES)[number];
}

/** GET /appointments/:id/alternative-doctors?date=YYYY-MM-DD&modes=same|all */
export class AlternativeDoctorsQueryDto {
  /** Day to check the doctors' free times for (defaults to the original day, or today if that has passed) */
  @IsOptional()
  @Transform(optionalText)
  @Matches(DATE_REGEX, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  /** "same": only doctors offering the original consultation type (default); "all": every consultation type */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(['same', 'all'], { message: 'modes must be same or all' })
  modes?: 'same' | 'all';
}

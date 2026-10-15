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

/** POST /appointments/:id/forward-reschedule (admin -> patient) */
export class ForwardRescheduleDto {
  /** Optional message from the Tabibistan team, added to the patient's notification */
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(500, { message: 'The message can be at most 500 characters' })
  note?: string;
}

export const PATIENT_RESPONSE_ACTIONS = ['ACCEPT', 'PROPOSE_SLOT', 'REQUEST_NEW_DOCTOR'] as const;
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
}

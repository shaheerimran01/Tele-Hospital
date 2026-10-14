import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  AppointmentStatus,
  ConsultationServiceMode,
  DoctorStatus,
} from '../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() || undefined : value;

const DOCTOR_STATUSES = Object.values(DoctorStatus);
const APPOINTMENT_STATUSES = Object.values(AppointmentStatus);
const SERVICE_MODES = Object.values(ConsultationServiceMode);

export const NOTIFICATION_FILTERS = ['ALL', 'UNREAD', 'READ', 'DOCTORS', 'APPOINTMENTS'] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

/** ?search= (and ?status= for doctors) */
export class AdminDoctorsQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(upper)
  @IsIn([...DOCTOR_STATUSES, 'ALL'], { message: `status must be one of: ALL, ${DOCTOR_STATUSES.join(', ')}` })
  status?: DoctorStatus | 'ALL';
}

export class AdminSearchQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class AdminAppointmentsQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(upper)
  @IsIn([...APPOINTMENT_STATUSES, 'ALL'], {
    message: `status must be one of: ALL, ${APPOINTMENT_STATUSES.join(', ')}`,
  })
  status?: AppointmentStatus | 'ALL';

  @IsOptional()
  @Transform(upper)
  @IsIn([...SERVICE_MODES, 'ALL'], { message: `serviceMode must be one of: ALL, ${SERVICE_MODES.join(', ')}` })
  serviceMode?: ConsultationServiceMode | 'ALL';
}

export class AdminNotificationsQueryDto {
  @IsOptional()
  @Transform(upper)
  @IsIn(NOTIFICATION_FILTERS, { message: `filter must be one of: ${NOTIFICATION_FILTERS.join(', ')}` })
  filter?: NotificationFilter;
}

export class UpdateDoctorStatusAdminDto {
  @Transform(upper)
  @IsIn(DOCTOR_STATUSES, { message: `status must be one of: ${DOCTOR_STATUSES.join(', ')}` })
  status: DoctorStatus;
}

export class UpdateAppointmentStatusDto {
  @Transform(upper)
  @IsIn(APPOINTMENT_STATUSES, { message: `status must be one of: ${APPOINTMENT_STATUSES.join(', ')}` })
  status: AppointmentStatus;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}

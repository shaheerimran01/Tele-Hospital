import { IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { DoctorStatus } from '../../generated/prisma/enums.js';

export const ADMIN_DOCTOR_STATUSES = [
  DoctorStatus.APPROVED,
  DoctorStatus.REJECTED,
  // Admin can send a profile back for review
  DoctorStatus.PENDING,
] as const;

export class UpdateDoctorStatusDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(ADMIN_DOCTOR_STATUSES, {
    message: `status must be one of: ${ADMIN_DOCTOR_STATUSES.join(', ')}`,
  })
  status: (typeof ADMIN_DOCTOR_STATUSES)[number];
}

// Notifications for the admin Doctor Portal (doctor registrations and appointments).
//
// The Notification table has no doctor/appointment columns, so these rows are
// told apart by their `type` prefix and point at their record through text in
// the message: the appointment number ("APT-202610-8492") or the doctor's PMDC
// number ("PMDC 12345-P"). The admin API turns those into links.

import { Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

export const DOCTOR_PORTAL_NOTIFICATION_TYPES = {
  DOCTOR_REGISTRATION: 'DOCTOR_REGISTRATION',
  DOCTOR_STATUS_UPDATED: 'DOCTOR_STATUS_UPDATED',
  APPOINTMENT_BOOKED: 'APPOINTMENT_BOOKED',
  APPOINTMENT_STATUS_UPDATED: 'APPOINTMENT_STATUS_UPDATED',
} as const;

export type DoctorPortalNotificationType =
  (typeof DOCTOR_PORTAL_NOTIFICATION_TYPES)[keyof typeof DOCTOR_PORTAL_NOTIFICATION_TYPES];

export const DOCTOR_TYPE_PREFIX = 'DOCTOR_';
export const APPOINTMENT_TYPE_PREFIX = 'APPOINTMENT_';

/** Rows that belong to the Doctor Portal. */
export const DOCTOR_PORTAL_NOTIFICATION_WHERE: Prisma.NotificationWhereInput = {
  OR: [
    { type: { startsWith: DOCTOR_TYPE_PREFIX } },
    { type: { startsWith: APPOINTMENT_TYPE_PREFIX } },
  ],
};

/** Everything else (used to keep the pharmacy/order feed unchanged). */
export const NOT_DOCTOR_PORTAL_NOTIFICATION_WHERE: Prisma.NotificationWhereInput = {
  NOT: DOCTOR_PORTAL_NOTIFICATION_WHERE,
};

export const APPOINTMENT_NUMBER_REGEX = /\bAPT-\d{6}-\d{4,6}\b/;
export const PMDC_REFERENCE_REGEX = /\(PMDC ([A-Za-z0-9-]+)\)/;

const logger = new Logger('DoctorPortalNotifications');

interface NotificationWriter {
  notification: { create(args: { data: Prisma.NotificationCreateInput }): Promise<unknown> };
}

/**
 * Saves a Doctor Portal notification. Never throws: a failed notification must
 * not undo a booking or a registration that already succeeded.
 */
export async function recordDoctorPortalNotification(
  db: NotificationWriter,
  input: { type: DoctorPortalNotificationType; title: string; message: string },
): Promise<void> {
  try {
    await db.notification.create({ data: input });
  } catch (error) {
    logger.warn(`Could not save "${input.type}" notification: ${(error as Error)?.message ?? error}`);
  }
}

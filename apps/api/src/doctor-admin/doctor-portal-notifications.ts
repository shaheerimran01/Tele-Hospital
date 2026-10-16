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
  /** Doctor declined a booking (message carries "Reason: ...") */
  APPOINTMENT_DECLINED: 'APPOINTMENT_DECLINED',
  /** Doctor moved a booking (message carries "Reason: ...") */
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  /** Admin sent the doctor's proposed time to the patient (saved as read) */
  APPOINTMENT_RESCHEDULE_FORWARDED: 'APPOINTMENT_RESCHEDULE_FORWARDED',
  /** Patient approved the proposed time or picked another one (saved as read) */
  APPOINTMENT_PATIENT_RESPONSE: 'APPOINTMENT_PATIENT_RESPONSE',
  /** Patient declined the proposed time and wants a different doctor (needs admin action) */
  APPOINTMENT_ALTERNATIVE_REQUESTED: 'APPOINTMENT_ALTERNATIVE_REQUESTED',
  /** Admin recommended another doctor to the patient (saved as read; carries "(PMDC x)") */
  APPOINTMENT_ALTERNATIVE_RECOMMENDED: 'APPOINTMENT_ALTERNATIVE_RECOMMENDED',
  /** Doctor marked an online consultation as a no-show (patient did not join within 10 minutes) */
  APPOINTMENT_NO_SHOW: 'APPOINTMENT_NO_SHOW',
  /** Doctor is waiting in the consultation room and the patient has not joined */
  PATIENT_NOT_JOINED_ALERT: 'PATIENT_NOT_JOINED_ALERT',
} as const;

/** Appointment alerts whose type does not start with "APPOINTMENT_" */
export const APPOINTMENT_ALERT_TYPES: string[] = [DOCTOR_PORTAL_NOTIFICATION_TYPES.PATIENT_NOT_JOINED_ALERT];

/** Doctor and patient actions the admin may need to follow up on. */
export const DOCTOR_ACTION_NOTIFICATION_TYPES: string[] = [
  DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_DECLINED,
  DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED,
  DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_ALTERNATIVE_REQUESTED,
];

/** The doctor's note inside an admin notification message ("... Reason: <note>") */
export const REASON_REGEX = /Reason: ([\s\S]+)$/;

export type DoctorPortalNotificationType =
  (typeof DOCTOR_PORTAL_NOTIFICATION_TYPES)[keyof typeof DOCTOR_PORTAL_NOTIFICATION_TYPES];

export const DOCTOR_TYPE_PREFIX = 'DOCTOR_';
export const APPOINTMENT_TYPE_PREFIX = 'APPOINTMENT_';

/** Rows that belong to the Doctor Portal. */
export const DOCTOR_PORTAL_NOTIFICATION_WHERE: Prisma.NotificationWhereInput = {
  OR: [
    { type: { startsWith: DOCTOR_TYPE_PREFIX } },
    { type: { startsWith: APPOINTMENT_TYPE_PREFIX } },
    { type: { in: APPOINTMENT_ALERT_TYPES } },
  ],
};

/** The "Appointments" category of the Doctor Portal feed */
export const APPOINTMENT_NOTIFICATION_WHERE: Prisma.NotificationWhereInput = {
  OR: [{ type: { startsWith: APPOINTMENT_TYPE_PREFIX } }, { type: { in: APPOINTMENT_ALERT_TYPES } }],
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

interface UserNotificationWriter {
  userNotification: { create(args: { data: Prisma.UserNotificationUncheckedCreateInput }): Promise<unknown> };
}

/** Patient-facing notification types (shown on the website's /notifications page). */
export const PATIENT_NOTIFICATION_TYPES = {
  APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_DECLINED: 'APPOINTMENT_DECLINED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_REASSIGNED: 'APPOINTMENT_REASSIGNED',
  APPOINTMENT_REFUNDED: 'APPOINTMENT_REFUNDED',
  /** Admin forwarded the doctor's proposed time; the patient approves or declines it */
  APPOINTMENT_RESCHEDULE_PROPOSED: 'APPOINTMENT_RESCHEDULE_PROPOSED',
  /** Admin recommended another doctor; the patient can book with them */
  APPOINTMENT_ALTERNATIVE_DOCTOR: 'APPOINTMENT_ALTERNATIVE_DOCTOR',
  /** The doctor is in the online consultation room and waiting for the patient */
  DOCTOR_WAITING_ALERT: 'DOCTOR_WAITING_ALERT',
  /** The patient did not join the online consultation; the doctor marked it as missed */
  APPOINTMENT_NO_SHOW: 'APPOINTMENT_NO_SHOW',
} as const;

/** Notifications shown on the doctor's own dashboard (DoctorNotification.type). */
export const DOCTOR_NOTIFICATION_TYPES = {
  /** Patient approved the doctor's proposed time */
  RESCHEDULE_APPROVED: 'RESCHEDULE_APPROVED',
  /** Patient asked for a different time; the doctor accepts it */
  NEW_SLOT_REQUESTED: 'NEW_SLOT_REQUESTED',
  /** Patient declined the proposed time and asked for another doctor */
  RESCHEDULE_DECLINED: 'RESCHEDULE_DECLINED',
} as const;

interface DoctorNotificationWriter {
  doctorNotification: { create(args: { data: Prisma.DoctorNotificationUncheckedCreateInput }): Promise<unknown> };
}

/** Saves a notification for the doctor's dashboard. Never throws. */
export async function recordDoctorNotification(
  db: DoctorNotificationWriter,
  input: { doctorId: string; appointmentId?: string | null; type: string; title: string; message: string },
): Promise<void> {
  try {
    await db.doctorNotification.create({ data: input });
  } catch (error) {
    logger.warn(`Could not save doctor "${input.type}" notification: ${(error as Error)?.message ?? error}`);
  }
}

/** "Ayesha Rahman" -> "Dr. Ayesha Rahman"; keeps an existing "Dr." / "Prof." */
export function doctorName(fullName: string) {
  const name = fullName.trim();
  return /^(dr|prof|professor)\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

/** "Thu, 22 Oct 2026 at 10:30 AM" for an appointment (date stored at UTC midnight) */
export function appointmentWhen(appointmentDate: Date, startTime: string) {
  const day = appointmentDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${day} at ${startTime.replace(/^0(\d)/, '$1')}`;
}

/** Saves a notification for the patient's account. Never throws. */
export async function recordPatientNotification(
  db: UserNotificationWriter,
  input: { userId: string; type: string; title: string; message: string },
): Promise<void> {
  try {
    await db.userNotification.create({ data: input });
  } catch (error) {
    logger.warn(`Could not save patient "${input.type}" notification: ${(error as Error)?.message ?? error}`);
  }
}

/**
 * Saves a Doctor Portal notification. Never throws: a failed notification must
 * not undo a booking or a registration that already succeeded.
 */
export async function recordDoctorPortalNotification(
  db: NotificationWriter,
  input: { type: DoctorPortalNotificationType; title: string; message: string; isRead?: boolean },
): Promise<void> {
  try {
    await db.notification.create({ data: input });
  } catch (error) {
    logger.warn(`Could not save "${input.type}" notification: ${(error as Error)?.message ?? error}`);
  }
}

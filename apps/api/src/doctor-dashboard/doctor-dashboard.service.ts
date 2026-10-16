import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentStatus, IntakeStatus, PaymentStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AppointmentsService } from '../appointments/appointments.service.js';
import { dateOnly, nowInAppZone, toMinutes } from '../appointments/slot-utils.js';
import {
  appointmentWhen,
  DOCTOR_NOTIFICATION_TYPES,
  DOCTOR_PORTAL_NOTIFICATION_TYPES,
  doctorName,
  PATIENT_NOTIFICATION_TYPES,
  recordDoctorPortalNotification,
  recordPatientNotification,
} from '../doctor-admin/doctor-portal-notifications.js';
import type { DoctorActionStatus } from './dto/doctor-dashboard.dto.js';

const ROW_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
  familyMember: { select: { fullName: true, relation: true, gender: true, age: true } },
  clinic: { select: { name: true, address: true } },
  intake: { select: { symptoms: true, symptomDuration: true, description: true } },
  consultationPrescription: { select: { id: true, pdfUrl: true, createdAt: true, updatedAt: true } },
} satisfies Prisma.AppointmentInclude;

type Row = Prisma.AppointmentGetPayload<{ include: typeof ROW_INCLUDE }>;

/** Which status changes the doctor may make, by current status. */
const ALLOWED_FROM: Record<DoctorActionStatus, AppointmentStatus[]> = {
  CONFIRMED: [AppointmentStatus.PENDING, AppointmentStatus.RESCHEDULED],
  COMPLETED: [AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED],
  CANCELLED: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED],
};

/** Appointments that are booked and still going ahead. */
const UPCOMING_STATUSES: AppointmentStatus[] = [AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED];

/** By date, then by clock time ("09:30 AM" strings don't sort correctly as text). */
const chronological = (a: Row, b: Row) =>
  a.appointmentDate.getTime() - b.appointmentDate.getTime() || (toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0);

@Injectable()
export class DoctorDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
  ) {}

  async getDashboard(doctorId: string) {
    const todayIso = nowInAppZone().date;
    const today = dateOnly(todayIso);
    const mine = { doctorId };

    // Appointments where the patient asked for another time (the doctor clicks "Accept Slot")
    const slotRequests = await this.prisma.doctorNotification.findMany({
      where: { doctorId, type: DOCTOR_NOTIFICATION_TYPES.NEW_SLOT_REQUESTED, isRead: false, appointmentId: { not: null } },
      select: { appointmentId: true },
    });
    const slotRequestedIds = [...new Set(slotRequests.map((r) => r.appointmentId!))];

    const [
      todaySchedule,
      requests,
      upcoming,
      completed,
      confirmed,
      cancelled,
      todayCount,
      pendingCount,
      earned,
      distinctPatients,
      patientGroups,
      completedByMode,
    ] = await Promise.all([
      // Today's schedule: still to happen today (pending, confirmed or moved to today)
      this.prisma.appointment.findMany({
        where: { ...mine, appointmentDate: today, status: { in: [AppointmentStatus.PENDING, ...UPCOMING_STATUSES] } },
        include: ROW_INCLUDE,
      }),
      // Requests waiting for a reply (new bookings and times the patient asked for), soonest first
      this.prisma.appointment.findMany({
        where: {
          ...mine,
          OR: [
            { status: AppointmentStatus.PENDING },
            { status: AppointmentStatus.RESCHEDULED, id: { in: slotRequestedIds } },
          ],
        },
        include: ROW_INCLUDE,
        orderBy: [{ appointmentDate: 'asc' }, { createdAt: 'asc' }],
        take: 200,
      }),
      // Confirmed appointments after today
      this.prisma.appointment.findMany({
        where: { ...mine, appointmentDate: { gt: today }, status: { in: UPCOMING_STATUSES } },
        include: ROW_INCLUDE,
        orderBy: [{ appointmentDate: 'asc' }],
        take: 100,
      }),
      this.prisma.appointment.findMany({
        where: { ...mine, status: AppointmentStatus.COMPLETED },
        include: ROW_INCLUDE,
        orderBy: [{ appointmentDate: 'desc' }, { updatedAt: 'desc' }],
        take: 100,
      }),
      // Appointments page, "Confirmed" tab: every confirmed / rescheduled appointment not finished yet
      this.prisma.appointment.findMany({
        where: { ...mine, status: { in: UPCOMING_STATUSES } },
        include: ROW_INCLUDE,
        orderBy: [{ appointmentDate: 'asc' }],
        take: 200,
      }),
      // Appointments page, "Declined / Cancelled" tab
      this.prisma.appointment.findMany({
        where: { ...mine, status: AppointmentStatus.CANCELLED },
        include: ROW_INCLUDE,
        orderBy: [{ updatedAt: 'desc' }],
        take: 100,
      }),
      this.prisma.appointment.count({
        where: { ...mine, appointmentDate: today, status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] } },
      }),
      this.prisma.appointment.count({
        where: {
          ...mine,
          OR: [
            { status: AppointmentStatus.PENDING },
            { status: AppointmentStatus.RESCHEDULED, id: { in: slotRequestedIds } },
          ],
        },
      }),
      this.prisma.appointment.aggregate({
        where: { ...mine, status: AppointmentStatus.COMPLETED, paymentStatus: PaymentStatus.PAID },
        _sum: { fee: true },
      }),
      this.prisma.appointment.findMany({ where: mine, distinct: ['userId'], select: { userId: true } }),
      this.prisma.appointment.groupBy({
        by: ['userId'],
        where: mine,
        _count: { _all: true },
        _max: { appointmentDate: true },
        orderBy: { _max: { appointmentDate: 'desc' } },
        take: 200,
      }),
      this.prisma.appointment.groupBy({
        by: ['serviceMode', 'paymentStatus'],
        where: { ...mine, status: AppointmentStatus.COMPLETED },
        _count: { _all: true },
        _sum: { fee: true },
      }),
    ]);

    // Patient names for the patients list
    const users = await this.prisma.user.findMany({
      where: { id: { in: patientGroups.map((g) => g.userId) } },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const [notificationItems, unreadNotifications] = await Promise.all([
      this.prisma.doctorNotification.findMany({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, type: true, title: true, message: true, isRead: true, createdAt: true, appointmentId: true },
      }),
      this.prisma.doctorNotification.count({ where: { doctorId, isRead: false } }),
    ]);

    const slotRequested = new Set(slotRequestedIds);
    const row = (a: Row) => this.toRow(a, slotRequested.has(a.id));

    return {
      today: todayIso,
      metrics: {
        todayAppointments: todayCount,
        pendingRequests: pendingCount,
        totalEarned: earned._sum.fee ?? 0,
        patients: distinctPatients.length,
      },
      todaySchedule: todaySchedule.sort(chronological).map(row),
      requests: requests.sort(chronological).map(row),
      upcoming: upcoming.sort(chronological).map(row),
      completed: completed.map(row),
      confirmed: confirmed.sort(chronological).map(row),
      cancelled: cancelled.map(row),
      /** updates from patients (accepted / requested times, declined proposals) */
      notifications: { items: notificationItems, unread: unreadNotifications },
      earnings: completedByMode.map((g) => ({
        serviceMode: g.serviceMode,
        paymentStatus: g.paymentStatus,
        count: g._count._all,
        total: g._sum.fee ?? 0,
      })),
      patients: patientGroups.map((g) => {
        const u = userById.get(g.userId);
        return {
          userId: g.userId,
          name: [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.phone || 'Patient',
          phone: u?.phone ?? null,
          appointments: g._count._all,
          lastAppointmentDate: g._max.appointmentDate,
        };
      }),
    };
  }

  async updateStatus(doctorId: string, appointmentId: string, status: DoctorActionStatus, reason?: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId },
      select: {
        id: true,
        status: true,
        appointmentNum: true,
        intakeId: true,
        userId: true,
        appointmentDate: true,
        startTime: true,
        patientType: true,
        doctor: { select: { fullName: true } },
        user: { select: { firstName: true, lastName: true, phone: true } },
        familyMember: { select: { fullName: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (!ALLOWED_FROM[status].includes(appointment.status)) {
      const verb = { CONFIRMED: 'approved', COMPLETED: 'marked completed', CANCELLED: 'declined' }[status];
      throw new BadRequestException(
        `This appointment is ${appointment.status.toLowerCase().replace('_', ' ')} and can't be ${verb}.`,
      );
    }
    if (status === 'CANCELLED' && !reason?.trim()) {
      throw new BadRequestException('Please enter a reason for declining');
    }

    const cancelReason = status === 'CANCELLED' ? reason!.trim() : null;
    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status, cancelReason },
      }),
      ...(status === 'COMPLETED' && appointment.intakeId
        ? [this.prisma.consultationIntake.update({ where: { id: appointment.intakeId }, data: { status: IntakeStatus.COMPLETED } })]
        : []),
    ]);

    // A pending "patient asked for this time" request is settled by any decision on the appointment
    await this.clearSlotRequest(doctorId, appointment.id);

    const dr = doctorName(appointment.doctor.fullName);
    const when = appointmentWhen(appointment.appointmentDate, appointment.startTime);
    const patient = this.patientLabel(appointment);

    if (status === 'CONFIRMED') {
      await recordPatientNotification(this.prisma, {
        userId: appointment.userId,
        type: PATIENT_NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
        title: 'Appointment Confirmed!',
        message: `${dr} has confirmed your appointment for ${when}.`,
      });
      await recordDoctorPortalNotification(this.prisma, {
        type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_STATUS_UPDATED,
        title: 'Appointment confirmed by doctor',
        message: `${dr} confirmed appointment ${appointment.appointmentNum} for patient ${patient}.`,
      });
    } else if (status === 'CANCELLED') {
      await recordDoctorPortalNotification(this.prisma, {
        type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_DECLINED,
        title: 'Appointment Declined by Doctor',
        message: `${dr} declined appointment ${appointment.appointmentNum} for patient ${patient}. Reason: ${cancelReason}`,
      });
      // Declines go to the admin team only; the patient is not notified here.
    } else {
      await recordDoctorPortalNotification(this.prisma, {
        type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_STATUS_UPDATED,
        title: 'Appointment completed',
        message: `${dr} completed appointment ${appointment.appointmentNum} for patient ${patient}.`,
      });
    }
    return this.getRow(doctorId, appointment.id);
  }

  slots(doctorId: string, appointmentId: string, date: string) {
    return this.appointments.slotsForReschedule(doctorId, appointmentId, date);
  }

  async reschedule(doctorId: string, appointmentId: string, date: string, startTime: string, reason: string) {
    const note = reason?.trim();
    if (!note) throw new BadRequestException('Please enter a reason for rescheduling');

    const before = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId },
      select: { appointmentDate: true, startTime: true },
    });
    if (!before) throw new NotFoundException('Appointment not found');

    const moved = await this.appointments.rescheduleByDoctor(doctorId, appointmentId, date, startTime, note);
    // The doctor proposed a different time instead of the patient's one
    await this.clearSlotRequest(doctorId, moved.id);
    const a = await this.prisma.appointment.findUniqueOrThrow({
      where: { id: moved.id },
      select: {
        patientType: true,
        doctor: { select: { fullName: true } },
        user: { select: { firstName: true, lastName: true, phone: true } },
        familyMember: { select: { fullName: true } },
      },
    });

    const dr = doctorName(a.doctor.fullName);
    const from = appointmentWhen(before.appointmentDate, before.startTime);
    const to = appointmentWhen(moved.appointmentDate, moved.startTime);
    await recordDoctorPortalNotification(this.prisma, {
      type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED,
      title: 'Appointment Rescheduled by Doctor',
      message: `${dr} rescheduled appointment ${moved.appointmentNum} for patient ${this.patientLabel(a)} from ${from} to ${to}. Reason: ${note}`,
    });
    // Reschedules go to the admin team only; the patient is not notified here.
    return this.getRow(doctorId, moved.id);
  }

  /** "Accept Slot": the doctor confirms the time the patient asked for. */
  async acceptSlot(doctorId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId },
      select: {
        id: true,
        status: true,
        appointmentNum: true,
        userId: true,
        appointmentDate: true,
        startTime: true,
        patientType: true,
        doctor: { select: { fullName: true } },
        user: { select: { firstName: true, lastName: true, phone: true } },
        familyMember: { select: { fullName: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const request = await this.prisma.doctorNotification.findFirst({
      where: { doctorId, appointmentId, type: DOCTOR_NOTIFICATION_TYPES.NEW_SLOT_REQUESTED, isRead: false },
      select: { id: true },
    });
    if (appointment.status !== AppointmentStatus.RESCHEDULED || !request) {
      throw new BadRequestException('There is no time request from the patient waiting for this appointment');
    }

    const { count } = await this.prisma.appointment.updateMany({
      where: { id: appointment.id, status: AppointmentStatus.RESCHEDULED },
      data: { status: AppointmentStatus.CONFIRMED, cancelReason: null },
    });
    if (count === 0) throw new BadRequestException('This appointment has already been updated');
    await this.clearSlotRequest(doctorId, appointment.id);

    const dr = doctorName(appointment.doctor.fullName);
    const when = appointmentWhen(appointment.appointmentDate, appointment.startTime);
    await recordPatientNotification(this.prisma, {
      userId: appointment.userId,
      type: PATIENT_NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
      title: 'Appointment Confirmed!',
      message: `${dr} has accepted your requested time. Your appointment ${appointment.appointmentNum} is confirmed for ${when}.`,
    });
    await recordDoctorPortalNotification(this.prisma, {
      type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_STATUS_UPDATED,
      title: "Doctor accepted the patient's time",
      message: `${dr} accepted the time requested by patient ${this.patientLabel(appointment)} for ${appointment.appointmentNum} (${when}). The appointment is confirmed.`,
    });
    return this.getRow(doctorId, appointment.id);
  }

  async markNotificationRead(doctorId: string, id: string) {
    const n = await this.prisma.doctorNotification.findFirst({ where: { id, doctorId }, select: { id: true, type: true } });
    if (!n) throw new NotFoundException('Notification not found');
    // A time request stays open until the doctor accepts it, proposes another time or declines
    if (n.type !== DOCTOR_NOTIFICATION_TYPES.NEW_SLOT_REQUESTED) {
      await this.prisma.doctorNotification.update({ where: { id }, data: { isRead: true } });
    }
    return { id, isRead: n.type !== DOCTOR_NOTIFICATION_TYPES.NEW_SLOT_REQUESTED };
  }

  async markAllNotificationsRead(doctorId: string) {
    const { count } = await this.prisma.doctorNotification.updateMany({
      where: { doctorId, isRead: false, type: { not: DOCTOR_NOTIFICATION_TYPES.NEW_SLOT_REQUESTED } },
      data: { isRead: true },
    });
    return { updated: count };
  }

  private async clearSlotRequest(doctorId: string, appointmentId: string) {
    await this.prisma.doctorNotification.updateMany({
      where: { doctorId, appointmentId, type: DOCTOR_NOTIFICATION_TYPES.NEW_SLOT_REQUESTED, isRead: false },
      data: { isRead: true },
    });
  }

  private patientLabel(a: {
    patientType: string;
    familyMember: { fullName: string } | null;
    user: { firstName: string | null; lastName: string | null; phone: string | null };
  }) {
    if (a.patientType === 'FAMILY_MEMBER' && a.familyMember) return a.familyMember.fullName;
    return [a.user.firstName, a.user.lastName].filter(Boolean).join(' ').trim() || a.user.phone || 'Patient';
  }

  // ---------------------------------------------------------------------------

  private async getRow(doctorId: string, id: string) {
    const a = await this.prisma.appointment.findFirst({ where: { id, doctorId }, include: ROW_INCLUDE });
    if (!a) throw new NotFoundException('Appointment not found');
    const pending = await this.prisma.doctorNotification.count({
      where: { doctorId, appointmentId: id, type: DOCTOR_NOTIFICATION_TYPES.NEW_SLOT_REQUESTED, isRead: false },
    });
    return this.toRow(a, pending > 0);
  }

  private toRow(a: Row, patientRequestedSlot = false) {
    const forFamily = a.patientType === 'FAMILY_MEMBER' && a.familyMember;
    const accountName = [a.user.firstName, a.user.lastName].filter(Boolean).join(' ').trim();
    return {
      id: a.id,
      appointmentNum: a.appointmentNum,
      status: a.status,
      serviceMode: a.serviceMode,
      appointmentDate: a.appointmentDate,
      startTime: a.startTime,
      endTime: a.endTime,
      fee: a.fee,
      paymentStatus: a.paymentStatus,
      paymentMethod: a.paymentMethod,
      cancelReason: a.cancelReason,
      patientType: a.patientType,
      patientName: forFamily ? a.familyMember!.fullName : accountName || a.user.phone || 'Patient',
      patientPhone: a.user.phone,
      /** e.g. "Spouse · Female · 31 yrs" for family members */
      familyMember: forFamily ? a.familyMember : null,
      bookedBy: forFamily ? accountName || a.user.phone : null,
      clinic: a.clinic,
      symptoms: a.intake?.symptoms ?? [],
      symptomDuration: a.intake?.symptomDuration ?? null,
      description: a.intake?.description ?? null,
      /** the patient asked for this time; the doctor can "Accept Slot" */
      patientRequestedSlot,
      /** the digital prescription, once written */
      prescription: a.consultationPrescription,
      prescriptionUrl: a.prescriptionUrl,
    };
  }
}

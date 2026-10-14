import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentStatus, IntakeStatus, PaymentStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AppointmentsService } from '../appointments/appointments.service.js';
import { dateOnly, nowInAppZone, toMinutes } from '../appointments/slot-utils.js';
import {
  DOCTOR_PORTAL_NOTIFICATION_TYPES,
  recordDoctorPortalNotification,
} from '../doctor-admin/doctor-portal-notifications.js';
import type { DoctorActionStatus } from './dto/doctor-dashboard.dto.js';

const ROW_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
  familyMember: { select: { fullName: true, relation: true, gender: true, age: true } },
  clinic: { select: { name: true, address: true } },
  intake: { select: { symptoms: true, symptomDuration: true, description: true } },
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

    const [
      todaySchedule,
      requests,
      upcoming,
      completed,
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
      // Requests waiting for a reply, soonest first
      this.prisma.appointment.findMany({
        where: { ...mine, status: AppointmentStatus.PENDING },
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
      this.prisma.appointment.count({
        where: { ...mine, appointmentDate: today, status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] } },
      }),
      this.prisma.appointment.count({ where: { ...mine, status: AppointmentStatus.PENDING } }),
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

    return {
      today: todayIso,
      metrics: {
        todayAppointments: todayCount,
        pendingRequests: pendingCount,
        totalEarned: earned._sum.fee ?? 0,
        patients: distinctPatients.length,
      },
      todaySchedule: todaySchedule.sort(chronological).map((a) => this.toRow(a)),
      requests: requests.sort(chronological).map((a) => this.toRow(a)),
      upcoming: upcoming.sort(chronological).map((a) => this.toRow(a)),
      completed: completed.map((a) => this.toRow(a)),
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
      select: { id: true, status: true, appointmentNum: true, intakeId: true, doctor: { select: { fullName: true } } },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (!ALLOWED_FROM[status].includes(appointment.status)) {
      const verb = { CONFIRMED: 'approved', COMPLETED: 'marked completed', CANCELLED: 'declined' }[status];
      throw new BadRequestException(
        `This appointment is ${appointment.status.toLowerCase().replace('_', ' ')} and can't be ${verb}.`,
      );
    }

    const cancelReason = status === 'CANCELLED' ? reason || 'Declined by the doctor' : null;
    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status, cancelReason },
      }),
      ...(status === 'COMPLETED' && appointment.intakeId
        ? [this.prisma.consultationIntake.update({ where: { id: appointment.intakeId }, data: { status: IntakeStatus.COMPLETED } })]
        : []),
    ]);

    const label = { CONFIRMED: 'confirmed', COMPLETED: 'completed', CANCELLED: 'declined' }[status];
    await recordDoctorPortalNotification(this.prisma, {
      type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_STATUS_UPDATED,
      title: `Appointment ${label} by doctor`,
      message: `${appointment.appointmentNum} was ${label} by ${appointment.doctor.fullName}${
        cancelReason ? `: ${cancelReason}` : '.'
      }`,
    });
    return this.getRow(doctorId, appointment.id);
  }

  slots(doctorId: string, appointmentId: string, date: string) {
    return this.appointments.slotsForReschedule(doctorId, appointmentId, date);
  }

  async reschedule(doctorId: string, appointmentId: string, date: string, startTime: string) {
    const moved = await this.appointments.rescheduleByDoctor(doctorId, appointmentId, date, startTime);
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId }, select: { fullName: true } });
    await recordDoctorPortalNotification(this.prisma, {
      type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_STATUS_UPDATED,
      title: 'Appointment rescheduled by doctor',
      message: `${moved.appointmentNum} was moved by ${doctor?.fullName ?? 'the doctor'} to ${date}, ${moved.startTime}.`,
    });
    return this.getRow(doctorId, moved.id);
  }

  // ---------------------------------------------------------------------------

  private async getRow(doctorId: string, id: string) {
    const a = await this.prisma.appointment.findFirst({ where: { id, doctorId }, include: ROW_INCLUDE });
    if (!a) throw new NotFoundException('Appointment not found');
    return this.toRow(a);
  }

  private toRow(a: Row) {
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
    };
  }
}

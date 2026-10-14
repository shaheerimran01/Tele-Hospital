import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentStatus, DoctorStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import {
  APPOINTMENT_NUMBER_REGEX,
  APPOINTMENT_TYPE_PREFIX,
  DOCTOR_PORTAL_NOTIFICATION_TYPES,
  DOCTOR_PORTAL_NOTIFICATION_WHERE,
  DOCTOR_TYPE_PREFIX,
  PMDC_REFERENCE_REGEX,
  recordDoctorPortalNotification,
} from './doctor-portal-notifications.js';
import {
  AdminAppointmentsQueryDto,
  AdminDoctorsQueryDto,
  AdminNotificationsQueryDto,
  AdminSearchQueryDto,
  UpdateAppointmentStatusDto,
  UpdateDoctorStatusAdminDto,
} from './dto/doctor-admin.dto.js';

/** Lists are capped; the admin narrows them with search and filters. */
const LIST_LIMIT = 300;

const DOCTOR_BRIEF_SELECT = {
  id: true,
  fullName: true,
  title: true,
  specialisations: true,
  pmdcNumber: true,
  profilePhotoUrl: true,
} satisfies Prisma.DoctorSelect;

const USER_BRIEF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
} satisfies Prisma.UserSelect;

const APPOINTMENT_LIST_INCLUDE = {
  doctor: { select: DOCTOR_BRIEF_SELECT },
  user: { select: USER_BRIEF_SELECT },
  familyMember: { select: { id: true, fullName: true, relation: true, gender: true, age: true } },
  clinic: { select: { id: true, name: true, address: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithPeople = Prisma.AppointmentGetPayload<{ include: typeof APPOINTMENT_LIST_INCLUDE }>;

const fullName = (u: { firstName: string | null; lastName: string | null } | null | undefined) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();

@Injectable()
export class DoctorAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorsService: DoctorsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------------

  async getOverview() {
    const [
      totalPatients,
      totalDoctors,
      pendingDoctors,
      totalAppointments,
      pendingAppointments,
      unreadNotifications,
      recentAppointments,
      recentNotifications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.doctor.count(),
      this.prisma.doctor.count({ where: { status: DoctorStatus.PENDING } }),
      this.prisma.appointment.count(),
      this.prisma.appointment.count({ where: { status: AppointmentStatus.PENDING } }),
      this.prisma.notification.count({ where: { AND: [DOCTOR_PORTAL_NOTIFICATION_WHERE, { isRead: false }] } }),
      this.prisma.appointment.findMany({
        include: APPOINTMENT_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.notification.findMany({
        where: DOCTOR_PORTAL_NOTIFICATION_WHERE,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    return {
      metrics: {
        totalPatients,
        totalDoctors,
        pendingDoctors,
        totalAppointments,
        pendingAppointments,
        unreadNotifications,
      },
      recentAppointments: recentAppointments.map((a) => this.toAppointmentRow(a)),
      recentNotifications: await this.withLinks(recentNotifications),
    };
  }

  /** Small counts for the sidebar badges. */
  async getCounts() {
    const [unreadNotifications, pendingAppointments, pendingDoctors] = await Promise.all([
      this.prisma.notification.count({ where: { AND: [DOCTOR_PORTAL_NOTIFICATION_WHERE, { isRead: false }] } }),
      this.prisma.appointment.count({ where: { status: AppointmentStatus.PENDING } }),
      this.prisma.doctor.count({ where: { status: DoctorStatus.PENDING } }),
    ]);
    return { unreadNotifications, pendingAppointments, pendingDoctors };
  }

  // ---------------------------------------------------------------------------
  // Doctors
  // ---------------------------------------------------------------------------

  async listDoctors(query: AdminDoctorsQueryDto) {
    const and: Prisma.DoctorWhereInput[] = [];
    if (query.status && query.status !== 'ALL') and.push({ status: query.status });
    if (query.search) {
      const s = query.search;
      and.push({
        OR: [
          { fullName: { contains: s, mode: 'insensitive' } },
          { pmdcNumber: { contains: s, mode: 'insensitive' } },
          { title: { contains: s, mode: 'insensitive' } },
          { specialisations: { has: s } },
          // Matches "derma" against "Dermatologist" etc.
          { specialisations: { hasSome: await this.matchingSpecialisations(s) } },
        ],
      });
    }

    const [doctors, counts] = await Promise.all([
      this.prisma.doctor.findMany({
        where: { AND: and },
        select: {
          ...DOCTOR_BRIEF_SELECT,
          degrees: true,
          education: true,
          experienceYears: true,
          status: true,
          isActive: true,
          createdAt: true,
          _count: { select: { appointments: true, clinics: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: LIST_LIMIT,
      }),
      this.prisma.doctor.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>;
    return {
      doctors,
      statusCounts: {
        ALL: counts.reduce((sum, c) => sum + c._count._all, 0),
        PENDING: byStatus.PENDING ?? 0,
        APPROVED: byStatus.APPROVED ?? 0,
        REJECTED: byStatus.REJECTED ?? 0,
      },
    };
  }

  async getDoctor(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        clinics: { include: { schedules: true }, orderBy: { createdAt: 'asc' } },
        onlineAvailabilities: true,
        _count: { select: { appointments: true } },
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const [recentAppointments, appointmentStatusCounts] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { doctorId: id },
        include: APPOINTMENT_LIST_INCLUDE,
        orderBy: [{ appointmentDate: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      this.prisma.appointment.groupBy({ by: ['status'], where: { doctorId: id }, _count: { _all: true } }),
    ]);

    return {
      ...doctor,
      recentAppointments: recentAppointments.map((a) => this.toAppointmentRow(a)),
      appointmentStatusCounts: Object.fromEntries(appointmentStatusCounts.map((c) => [c.status, c._count._all])),
    };
  }

  async updateDoctorStatus(id: string, dto: UpdateDoctorStatusAdminDto) {
    const before = await this.prisma.doctor.findUnique({
      where: { id },
      select: { status: true, fullName: true, pmdcNumber: true },
    });
    if (!before) throw new NotFoundException('Doctor not found');

    // Same update the doctor app uses (also keeps the doctor's login record in step)
    await this.doctorsService.updateStatus(id, { status: dto.status });

    if (before.status !== dto.status) {
      const label = { APPROVED: 'approved', REJECTED: 'rejected', PENDING: 'moved back to pending review' }[dto.status];
      await recordDoctorPortalNotification(this.prisma, {
        type: DOCTOR_PORTAL_NOTIFICATION_TYPES.DOCTOR_STATUS_UPDATED,
        title: `Doctor ${dto.status === 'PENDING' ? 'marked pending' : label}`,
        message: `${before.fullName} (PMDC ${before.pmdcNumber}) was ${label}.`,
      });
    }
    return this.getDoctor(id);
  }

  // ---------------------------------------------------------------------------
  // Patients (all registered users)
  // ---------------------------------------------------------------------------

  async listPatients(query: AdminSearchQueryDto) {
    const s = query.search;
    const words = s?.split(/\s+/).filter(Boolean) ?? [];
    const where: Prisma.UserWhereInput = s
      ? {
          OR: [
            { phone: { contains: s.replace(/[\s-]/g, '') } },
            { email: { contains: s, mode: 'insensitive' } },
            // "Ali Khan" matches first + last name
            {
              AND: words.map((w) => ({
                OR: [
                  { firstName: { contains: w, mode: 'insensitive' as const } },
                  { lastName: { contains: w, mode: 'insensitive' as const } },
                ],
              })),
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...USER_BRIEF_SELECT,
          createdAt: true,
          _count: { select: { familyMembers: true, appointments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { patients: users, total };
  }

  async getPatient(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_BRIEF_SELECT,
        createdAt: true,
        familyMembers: { orderBy: { createdAt: 'asc' } },
        _count: { select: { appointments: true, consultationIntakes: true } },
      },
    });
    if (!user) throw new NotFoundException('Patient not found');

    const appointments = await this.prisma.appointment.findMany({
      where: { userId: id },
      include: APPOINTMENT_LIST_INCLUDE,
      orderBy: [{ appointmentDate: 'desc' }, { createdAt: 'desc' }],
    });

    const totalSpent = appointments
      .filter((a) => a.paymentStatus === 'PAID')
      .reduce((sum, a) => sum + a.fee, 0);

    return {
      ...user,
      appointments: appointments.map((a) => this.toAppointmentRow(a)),
      totalSpent,
    };
  }

  // ---------------------------------------------------------------------------
  // Appointments
  // ---------------------------------------------------------------------------

  async listAppointments(query: AdminAppointmentsQueryDto) {
    const and: Prisma.AppointmentWhereInput[] = [];
    if (query.status && query.status !== 'ALL') and.push({ status: query.status });
    if (query.serviceMode && query.serviceMode !== 'ALL') and.push({ serviceMode: query.serviceMode });
    if (query.search) {
      const s = query.search;
      and.push({
        OR: [
          { appointmentNum: { contains: s, mode: 'insensitive' } },
          { doctor: { fullName: { contains: s, mode: 'insensitive' } } },
          { familyMember: { fullName: { contains: s, mode: 'insensitive' } } },
          { user: { firstName: { contains: s, mode: 'insensitive' } } },
          { user: { lastName: { contains: s, mode: 'insensitive' } } },
          { user: { phone: { contains: s.replace(/[\s-]/g, '') } } },
        ],
      });
    }

    const [appointments, total, counts] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { AND: and },
        include: APPOINTMENT_LIST_INCLUDE,
        orderBy: [{ appointmentDate: 'desc' }, { createdAt: 'desc' }],
        take: LIST_LIMIT,
      }),
      this.prisma.appointment.count({ where: { AND: and } }),
      this.prisma.appointment.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return {
      appointments: appointments.map((a) => this.toAppointmentRow(a)),
      total,
      statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>,
    };
  }

  async getAppointment(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            ...DOCTOR_BRIEF_SELECT,
            degrees: true,
            experienceYears: true,
            phone: true,
            email: true,
            status: true,
          },
        },
        user: { select: { ...USER_BRIEF_SELECT, createdAt: true } },
        familyMember: true,
        clinic: { select: { id: true, name: true, address: true, phone: true, latitude: true, longitude: true, inPersonFee: true } },
        intake: {
          include: {
            speciality: { select: { id: true, name: true } },
            familyMember: { select: { id: true, fullName: true, relation: true, gender: true, age: true } },
          },
        },
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return { ...appointment, patientName: this.patientName(appointment) };
  }

  async updateAppointmentStatus(id: string, dto: UpdateAppointmentStatusDto) {
    const before = await this.prisma.appointment.findUnique({
      where: { id },
      select: { status: true, appointmentNum: true, doctor: { select: { fullName: true } } },
    });
    if (!before) throw new NotFoundException('Appointment not found');
    if (dto.status === AppointmentStatus.CANCELLED && !dto.cancelReason) {
      throw new BadRequestException('Please give a reason for cancelling this appointment');
    }

    await this.prisma.appointment.update({
      where: { id },
      data: {
        status: dto.status,
        cancelReason: dto.status === AppointmentStatus.CANCELLED ? dto.cancelReason : null,
      },
    });

    if (before.status !== dto.status) {
      const label = dto.status.replace('_', ' ').toLowerCase();
      await recordDoctorPortalNotification(this.prisma, {
        type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_STATUS_UPDATED,
        title: `Appointment ${label}`,
        message: `${before.appointmentNum} with ${before.doctor.fullName} was marked ${label}${
          dto.status === AppointmentStatus.CANCELLED && dto.cancelReason ? `: ${dto.cancelReason}` : '.'
        }`,
      });
    }
    return this.getAppointment(id);
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  async listNotifications(query: AdminNotificationsQueryDto) {
    const filter = query.filter ?? 'ALL';
    const and: Prisma.NotificationWhereInput[] = [DOCTOR_PORTAL_NOTIFICATION_WHERE];
    if (filter === 'UNREAD') and.push({ isRead: false });
    if (filter === 'READ') and.push({ isRead: true });
    if (filter === 'DOCTORS') and.push({ type: { startsWith: DOCTOR_TYPE_PREFIX } });
    if (filter === 'APPOINTMENTS') and.push({ type: { startsWith: APPOINTMENT_TYPE_PREFIX } });

    const [rows, unread, doctors, appointments, total] = await Promise.all([
      this.prisma.notification.findMany({ where: { AND: and }, orderBy: { createdAt: 'desc' }, take: LIST_LIMIT }),
      this.prisma.notification.count({ where: { AND: [DOCTOR_PORTAL_NOTIFICATION_WHERE, { isRead: false }] } }),
      this.prisma.notification.count({ where: { type: { startsWith: DOCTOR_TYPE_PREFIX } } }),
      this.prisma.notification.count({ where: { type: { startsWith: APPOINTMENT_TYPE_PREFIX } } }),
      this.prisma.notification.count({ where: DOCTOR_PORTAL_NOTIFICATION_WHERE }),
    ]);

    return {
      notifications: await this.withLinks(rows),
      counts: { ALL: total, UNREAD: unread, READ: total - unread, DOCTORS: doctors, APPOINTMENTS: appointments },
    };
  }

  async markAllNotificationsRead() {
    const { count } = await this.prisma.notification.updateMany({
      where: { AND: [DOCTOR_PORTAL_NOTIFICATION_WHERE, { isRead: false }] },
      data: { isRead: true },
    });
    return { updated: count };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private patientName(a: {
    patientType: string;
    familyMember: { fullName: string } | null;
    user: { firstName: string | null; lastName: string | null; phone?: string | null } | null;
  }) {
    if (a.patientType === 'FAMILY_MEMBER' && a.familyMember) return a.familyMember.fullName;
    return fullName(a.user) || a.user?.phone || 'Patient';
  }

  private toAppointmentRow(a: AppointmentWithPeople) {
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
      patientType: a.patientType,
      patientName: this.patientName(a),
      familyMember: a.familyMember,
      user: a.user,
      doctor: a.doctor,
      clinic: a.clinic,
      createdAt: a.createdAt,
    };
  }

  /** Adds `link` to notifications that mention an appointment number or PMDC number. */
  private async withLinks<T extends { message: string; type: string }>(rows: T[]) {
    const nums = [...new Set(rows.map((r) => r.message.match(APPOINTMENT_NUMBER_REGEX)?.[0]).filter(Boolean))] as string[];
    const pmdcs = [...new Set(rows.map((r) => r.message.match(PMDC_REFERENCE_REGEX)?.[1]).filter(Boolean))] as string[];

    const [appointments, doctors] = await Promise.all([
      nums.length
        ? this.prisma.appointment.findMany({ where: { appointmentNum: { in: nums } }, select: { id: true, appointmentNum: true } })
        : Promise.resolve([]),
      pmdcs.length
        ? this.prisma.doctor.findMany({ where: { pmdcNumber: { in: pmdcs } }, select: { id: true, pmdcNumber: true } })
        : Promise.resolve([]),
    ]);
    const aptIds = new Map(appointments.map((a) => [a.appointmentNum, a.id]));
    const docIds = new Map(doctors.map((d) => [d.pmdcNumber, d.id]));

    return rows.map((r) => {
      const num = r.message.match(APPOINTMENT_NUMBER_REGEX)?.[0];
      const pmdc = r.message.match(PMDC_REFERENCE_REGEX)?.[1];
      const link =
        num && aptIds.has(num)
          ? { kind: 'appointment' as const, id: aptIds.get(num)! }
          : pmdc && docIds.has(pmdc)
            ? { kind: 'doctor' as const, id: docIds.get(pmdc)! }
            : null;
      return {
        ...r,
        category: r.type.startsWith(DOCTOR_TYPE_PREFIX) ? ('DOCTORS' as const) : ('APPOINTMENTS' as const),
        link,
      };
    });
  }

  /** Specialisation values (stored as free text arrays) that contain the search text. */
  private async matchingSpecialisations(search: string): Promise<string[]> {
    const rows = await this.prisma.doctor.findMany({ select: { specialisations: true }, take: 1000 });
    const s = search.toLowerCase();
    return [...new Set(rows.flatMap((r) => r.specialisations).filter((x) => x.toLowerCase().includes(s)))];
  }
}

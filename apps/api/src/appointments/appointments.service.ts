import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AppointmentStatus,
  ConsultationServiceMode,
  DoctorStatus,
  IntakeStatus,
  PatientType,
} from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { GetSlotsDto } from './dto/get-slots.dto.js';
import {
  DOCTOR_NOTIFICATION_TYPES,
  DOCTOR_PORTAL_NOTIFICATION_TYPES,
  recordDoctorPortalNotification,
} from '../doctor-admin/doctor-portal-notifications.js';
import {
  buildSlots,
  dateOnly,
  dayOfWeek,
  daysBetween,
  MAX_DAYS_AHEAD,
  nowInAppZone,
  SLOT_MINUTES,
  toMinutes,
  WEEK_DAYS,
  type Slot,
} from './slot-utils.js';

/** Appointments in these states hold their time slot. */
const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
];

/** Public doctor fields shared with patients (no phone, email or documents). */
const DOCTOR_PUBLIC_SELECT = {
  id: true,
  fullName: true,
  title: true,
  degrees: true,
  experienceYears: true,
  specialisations: true,
  languages: true,
  profilePhotoUrl: true,
  isVideoCallEnabled: true,
  videoCallFee: true,
  isTextConsultEnabled: true,
  textConsultFee: true,
} satisfies Prisma.DoctorSelect;

const CLINIC_PUBLIC_SELECT = {
  id: true,
  name: true,
  address: true,
  phone: true,
  latitude: true,
  longitude: true,
  inPersonFee: true,
} satisfies Prisma.DoctorClinicSelect;

const APPOINTMENT_INCLUDE = {
  doctor: { select: DOCTOR_PUBLIC_SELECT },
  clinic: { select: CLINIC_PUBLIC_SELECT },
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
  familyMember: { select: { id: true, fullName: true, relation: true, gender: true, age: true } },
  intake: {
    select: {
      id: true,
      symptoms: true,
      symptomDuration: true,
      speciality: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.AppointmentInclude;

type DoctorForBooking = Prisma.DoctorGetPayload<{
  select: typeof DOCTOR_PUBLIC_SELECT & {
    status: true;
    isActive: true;
    onlineAvailabilities: { select: { dayOfWeek: true; startTime: true; endTime: true } };
    clinics: {
      select: typeof CLINIC_PUBLIC_SELECT & {
        schedules: { select: { dayOfWeek: true; startTime: true; endTime: true } };
      };
    };
  };
}>;

type Db = Prisma.TransactionClient | PrismaService;

/**
 * Appointments the admin asked another doctor to take, which that doctor hasn't
 * approved (still pending, or declined / withdrawn). The patient doesn't see them:
 * they are told only once the new doctor confirms.
 */
export const UNAPPROVED_ADMIN_REQUEST_WHERE: Prisma.AppointmentWhereInput = {
  AND: [
    { status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CANCELLED] } },
    { doctorNotifications: { some: { type: DOCTOR_NOTIFICATION_TYPES.ADMIN_ASSIGNED_REQUEST } } },
  ],
};

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // GET /appointments/available-slots
  // ---------------------------------------------------------------------------

  async getAvailableSlots(query: GetSlotsDto) {
    this.assertBookableDate(query.date);

    const doctor = await this.loadDoctor(this.prisma, query.doctorId);
    const { clinic, fee, windows, workingDays } = this.resolveService(
      doctor,
      query.serviceMode,
      query.clinicId,
    );

    const slots = await this.freeSlots(this.prisma, doctor.id, query.date, windows);
    const { clinics, onlineAvailabilities, status, isActive, ...doctorBrief } = doctor;

    return {
      date: query.date,
      dayOfWeek: dayOfWeek(query.date),
      serviceMode: query.serviceMode,
      slotMinutes: SLOT_MINUTES,
      availableSlots: slots.map((s) => s.startTime),
      slots: slots.map(({ startTime, endTime }) => ({ startTime, endTime })),
      clinic: clinic ? this.publicClinic(clinic) : null,
      fee,
      /** Days of the week this doctor works for the chosen mode/clinic */
      workingDays,
      doctor: {
        ...doctorBrief,
        clinics: clinics.map((c) => this.publicClinic(c)),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // POST /appointments
  // ---------------------------------------------------------------------------

  async create(userId: string, dto: CreateAppointmentDto) {
    this.assertBookableDate(dto.appointmentDate);

    const start = toMinutes(dto.startTime);
    if (start == null) throw new BadRequestException('startTime is not a valid time');
    if (dto.endTime && toMinutes(dto.endTime) !== start + SLOT_MINUTES) {
      throw new BadRequestException(`Each appointment is ${SLOT_MINUTES} minutes long`);
    }

    // Checks that don't need the lock
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('Your account was not found. Please log in again.');

    let familyMemberId: string | null = null;
    if (dto.patientType === PatientType.FAMILY_MEMBER) {
      const member = await this.prisma.familyMember.findFirst({
        where: { id: dto.familyMemberId, userId },
        select: { id: true },
      });
      if (!member) throw new NotFoundException('The selected family member was not found');
      familyMemberId = member.id;
    }

    let releaseFrom: string | null = null;
    if (dto.intakeId) {
      const intake = await this.prisma.consultationIntake.findFirst({
        where: { id: dto.intakeId, userId },
        select: { id: true, status: true, appointment: { select: { id: true, appointmentNum: true, status: true } } },
      });
      if (!intake) throw new NotFoundException('Consultation details not found');
      // A cancelled booking (e.g. declined by the doctor) releases its consultation details,
      // so the patient can book another doctor with the same symptoms and voice note.
      if (intake.appointment && intake.appointment.status === AppointmentStatus.CANCELLED) {
        releaseFrom = intake.appointment.id;
      } else if (intake.appointment) {
        throw new ConflictException(
          `These consultation details are already booked (appointment ${intake.appointment.appointmentNum}).`,
        );
      }
      if (intake.status === IntakeStatus.CANCELLED || intake.status === IntakeStatus.COMPLETED) {
        throw new BadRequestException('This consultation request is closed. Please start a new one.');
      }
    }

    const date = dto.appointmentDate;
    const book = () => this.prisma.$transaction(
      async (tx) => {
        // One booking at a time per doctor and day: concurrent requests wait here,
        // then see each other's appointments, so a slot can't be taken twice.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`appointment:${dto.doctorId}:${date}`}))::text AS locked`;

        const doctor = await this.loadDoctor(tx, dto.doctorId);
        const { clinic, fee, windows } = this.resolveService(doctor, dto.serviceMode, dto.clinicId);

        const free = await this.freeSlots(tx, doctor.id, date, windows);
        const slot = free.find((s) => s.start === start);
        if (!slot) {
          throw new ConflictException(
            'Sorry, this time slot is no longer available. Please choose another time.',
          );
        }

        if (releaseFrom) {
          await tx.appointment.updateMany({
            where: { id: releaseFrom, status: AppointmentStatus.CANCELLED },
            data: { intakeId: null },
          });
        }

        const appointment = await this.createWithUniqueNumber(tx, {
          userId,
          doctorId: doctor.id,
          clinicId: clinic?.id ?? null,
          intakeId: dto.intakeId ?? null,
          patientType: dto.patientType,
          familyMemberId,
          serviceMode: dto.serviceMode,
          appointmentDate: dateOnly(date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          fee,
          paymentMethod: dto.paymentMethod,
        });

        if (dto.intakeId) {
          await tx.consultationIntake.update({
            where: { id: dto.intakeId },
            data: { status: IntakeStatus.DOCTOR_ASSIGNED, serviceMode: dto.serviceMode },
          });
        }
        return appointment;
      },
      { timeout: 15_000 },
    );

    let result: Awaited<ReturnType<typeof book>> | undefined;
    for (let attempt = 1; !result; attempt++) {
      try {
        result = await book();
      } catch (error) {
        const { code, meta } = (error ?? {}) as { code?: string; meta?: { target?: unknown } };
        if (code !== 'P2002') throw error;
        if (String(meta?.target ?? '').includes('intake')) {
          throw new ConflictException('These consultation details are already booked.');
        }
        // Two bookings picked the same appointment number at once: try again
        if (attempt >= 3) throw new ConflictException('Could not complete the booking. Please try again.');
      }
    }

    await recordDoctorPortalNotification(this.prisma, {
      type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_BOOKED,
      title: 'New appointment booked',
      message: `${result.appointmentNum} booked with ${result.doctor.fullName} for ${date}, ${result.startTime}.`,
    });

    this.logger.log(`Appointment ${result.appointmentNum} booked for doctor ${dto.doctorId} on ${date} ${result.startTime}`);
    return result;
  }

  // ---------------------------------------------------------------------------
  // GET /appointments/:id and GET /appointments (patient's own)
  // ---------------------------------------------------------------------------

  async findOne(userId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, userId, NOT: UNAPPROVED_ADMIN_REQUEST_WHERE },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async findForUser(userId: string) {
    return this.prisma.appointment.findMany({
      where: { userId, NOT: UNAPPROVED_ADMIN_REQUEST_WHERE },
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ appointmentDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  // ---------------------------------------------------------------------------
  // Doctor-side rescheduling (used by the doctor dashboard)
  // ---------------------------------------------------------------------------

  /** Free slots on `date` for moving one of this doctor's appointments. */
  async slotsForReschedule(doctorId: string, appointmentId: string, date: string) {
    this.assertBookableDate(date);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId },
      select: { id: true, serviceMode: true, clinicId: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const doctor = await this.loadDoctor(this.prisma, doctorId, false);
    const { windows, workingDays } = this.resolveService(doctor, appointment.serviceMode, appointment.clinicId ?? undefined);
    const slots = await this.freeSlots(this.prisma, doctorId, date, windows, appointment.id);
    return {
      date,
      dayOfWeek: dayOfWeek(date),
      workingDays,
      slots: slots.map(({ startTime, endTime }) => ({ startTime, endTime })),
    };
  }

  /** Moves an appointment to a free slot; it becomes RESCHEDULED. */
  async rescheduleByDoctor(doctorId: string, appointmentId: string, date: string, startTime: string, reason?: string) {
    this.assertBookableDate(date);
    const start = toMinutes(startTime);
    if (start == null) throw new BadRequestException('startTime is not a valid time');

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`appointment:${doctorId}:${date}`}))::text AS locked`;

        const appointment = await tx.appointment.findFirst({
          where: { id: appointmentId, doctorId },
          select: { id: true, status: true, serviceMode: true, clinicId: true },
        });
        if (!appointment) throw new NotFoundException('Appointment not found');
        if (!ACTIVE_STATUSES.includes(appointment.status)) {
          throw new BadRequestException('Only pending or confirmed appointments can be rescheduled');
        }

        const doctor = await this.loadDoctor(tx, doctorId, false);
        const { windows } = this.resolveService(doctor, appointment.serviceMode, appointment.clinicId ?? undefined);
        const free = await this.freeSlots(tx, doctorId, date, windows, appointment.id);
        const slot = free.find((s) => s.start === start);
        if (!slot) {
          throw new ConflictException('That time is not free. Please choose another slot.');
        }

        return tx.appointment.update({
          where: { id: appointment.id },
          data: {
            appointmentDate: dateOnly(date),
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: AppointmentStatus.RESCHEDULED,
            // The doctor's note is kept with the appointment
            cancelReason: reason ?? null,
          },
          select: { id: true, appointmentNum: true, appointmentDate: true, startTime: true, endTime: true, status: true },
        });
      },
      { timeout: 15_000 },
    );
  }

  /**
   * Patient picks another free time with the same doctor (after declining the doctor's proposal).
   * The booking moves to that time and stays RESCHEDULED until the doctor accepts it.
   */
  async moveForPatient(userId: string, appointmentId: string, date: string, startTime: string, note: string) {
    this.assertBookableDate(date);
    const start = toMinutes(startTime);
    if (start == null) throw new BadRequestException('startTime is not a valid time');

    const current = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, userId },
      select: { doctorId: true },
    });
    if (!current) throw new NotFoundException('Appointment not found');

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`appointment:${current.doctorId}:${date}`}))::text AS locked`;

        const appointment = await tx.appointment.findFirst({
          where: { id: appointmentId, userId },
          select: { id: true, status: true, serviceMode: true, clinicId: true, doctorId: true },
        });
        if (!appointment || appointment.doctorId !== current.doctorId) throw new NotFoundException('Appointment not found');
        if (appointment.status !== AppointmentStatus.RESCHEDULED) {
          throw new BadRequestException('This appointment is no longer waiting for a new time');
        }

        const doctor = await this.loadDoctor(tx, appointment.doctorId, false);
        const { windows } = this.resolveService(doctor, appointment.serviceMode, appointment.clinicId ?? undefined);
        const free = await this.freeSlots(tx, appointment.doctorId, date, windows, appointment.id);
        const slot = free.find((s) => s.start === start);
        if (!slot) throw new ConflictException('Sorry, that time is no longer free. Please choose another time.');

        return tx.appointment.update({
          where: { id: appointment.id },
          data: {
            appointmentDate: dateOnly(date),
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: AppointmentStatus.RESCHEDULED,
            cancelReason: note,
          },
          select: { id: true, appointmentNum: true, appointmentDate: true, startTime: true, endTime: true, doctorId: true },
        });
      },
      { timeout: 15_000 },
    );
  }

  // ---------------------------------------------------------------------------
  // Admin: move a booking to another doctor (same date and time)
  // ---------------------------------------------------------------------------

  /** Approved doctors who offer the same consultation type, and whether they are free at that time. */
  async reassignOptions(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        doctorId: true,
        serviceMode: true,
        appointmentDate: true,
        startTime: true,
        intake: { select: { speciality: { select: { name: true } } } },
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const date = appointment.appointmentDate.toISOString().slice(0, 10);
    const start = toMinutes(appointment.startTime);
    let dateProblem: string | null = null;
    try {
      this.assertBookableDate(date);
    } catch (e) {
      dateProblem = (e as Error).message;
    }

    const modeFilter: Prisma.DoctorWhereInput =
      appointment.serviceMode === ConsultationServiceMode.VIDEO
        ? { isVideoCallEnabled: true }
        : appointment.serviceMode === ConsultationServiceMode.TEXT
          ? { isTextConsultEnabled: true }
          : { clinics: { some: {} } };

    const scheduleSelect = { select: { dayOfWeek: true, startTime: true, endTime: true } };
    const doctors = await this.prisma.doctor.findMany({
      where: { AND: [{ status: DoctorStatus.APPROVED }, { isActive: true }, { id: { not: appointment.doctorId } }, modeFilter] },
      select: {
        ...DOCTOR_PUBLIC_SELECT,
        status: true,
        isActive: true,
        onlineAvailabilities: scheduleSelect,
        clinics: { select: { ...CLINIC_PUBLIC_SELECT, schedules: scheduleSelect }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { fullName: 'asc' },
      take: 100,
    });

    const speciality = appointment.intake?.speciality?.name?.toLowerCase() ?? null;
    const results = [];
    for (const doctor of doctors) {
      const targets =
        appointment.serviceMode === ConsultationServiceMode.IN_CLINIC
          ? doctor.clinics.map((c) => ({ clinicId: c.id as string | null, clinicName: c.name as string | null, address: c.address as string | null, fee: c.inPersonFee as number | null, windows: c.schedules }))
          : [{
              clinicId: null,
              clinicName: null,
              address: null,
              fee: appointment.serviceMode === ConsultationServiceMode.VIDEO ? doctor.videoCallFee : doctor.textConsultFee,
              windows: doctor.onlineAvailabilities,
            }];

      const options = [];
      for (const t of targets) {
        let available = false;
        if (!dateProblem && start != null && t.fee != null) {
          const free = await this.freeSlots(this.prisma, doctor.id, date, t.windows);
          available = free.some((s) => s.start === start);
        }
        options.push({ clinicId: t.clinicId, clinicName: t.clinicName, address: t.address, fee: t.fee, available });
      }

      results.push({
        doctorId: doctor.id,
        fullName: doctor.fullName,
        title: doctor.title,
        specialisations: doctor.specialisations,
        experienceYears: doctor.experienceYears,
        matchesSpeciality: speciality
          ? doctor.specialisations.some((x) => x.toLowerCase().includes(speciality) || speciality.includes(x.toLowerCase()))
          : false,
        options,
      });
    }

    // Free + same speciality first
    results.sort(
      (a, b) =>
        Number(b.options.some((o) => o.available)) - Number(a.options.some((o) => o.available)) ||
        Number(b.matchesSpeciality) - Number(a.matchesSpeciality) ||
        a.fullName.localeCompare(b.fullName),
    );

    return {
      date,
      startTime: appointment.startTime,
      serviceMode: appointment.serviceMode,
      speciality: appointment.intake?.speciality?.name ?? null,
      dateProblem,
      doctors: results,
    };
  }

  /**
   * Gives the booking to another doctor at the same date and time.
   * It goes back to PENDING so the new doctor can accept it; the fee follows the new doctor.
   */
  async reassign(appointmentId: string, doctorId: string, clinicId?: string) {
    const current = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { appointmentDate: true, doctorId: true, status: true },
    });
    if (!current) throw new NotFoundException('Appointment not found');
    if (current.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('A completed appointment cannot be reassigned');
    }
    if (current.doctorId === doctorId) {
      throw new BadRequestException('Please choose a different doctor');
    }
    const date = current.appointmentDate.toISOString().slice(0, 10);
    this.assertBookableDate(date);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`appointment:${doctorId}:${date}`}))::text AS locked`;

        const appointment = await tx.appointment.findUniqueOrThrow({
          where: { id: appointmentId },
          select: { id: true, serviceMode: true, startTime: true, doctor: { select: { fullName: true } } },
        });
        const doctor = await this.loadDoctor(tx, doctorId);
        const { clinic, fee, windows } = this.resolveService(doctor, appointment.serviceMode, clinicId);

        const start = toMinutes(appointment.startTime);
        const free = await this.freeSlots(tx, doctorId, date, windows);
        const slot = free.find((s) => s.start === start);
        if (!slot) {
          throw new ConflictException(`${doctor.fullName} is not free at this time. Please choose another doctor.`);
        }

        const updated = await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            doctorId,
            clinicId: clinic?.id ?? null,
            fee,
            status: AppointmentStatus.PENDING,
            cancelReason: null,
          },
          select: {
            id: true,
            appointmentNum: true,
            appointmentDate: true,
            startTime: true,
            userId: true,
            doctor: { select: { fullName: true } },
          },
        });
        return { ...updated, previousDoctorName: appointment.doctor.fullName };
      },
      { timeout: 15_000 },
    );
  }

  // ---------------------------------------------------------------------------
  // Admin: ask another doctor to take a cancelled booking
  // ---------------------------------------------------------------------------

  /**
   * A new PENDING appointment with `doctorId` for the same patient, at a free
   * time of that doctor. The consultation details (symptoms, voice note) move to
   * it from the cancelled booking. Nobody is notified here.
   */
  async createAdminRequest(
    source: {
      userId: string;
      patientType: PatientType;
      familyMemberId: string | null;
      intakeId: string | null;
      paymentMethod: string | null;
    },
    request: { doctorId: string; serviceMode: ConsultationServiceMode; clinicId?: string; date: string; startTime: string },
  ) {
    this.assertBookableDate(request.date);
    const start = toMinutes(request.startTime);
    if (start == null) throw new BadRequestException('startTime is not a valid time');
    const date = request.date;

    const book = () =>
      this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`appointment:${request.doctorId}:${date}`}))::text AS locked`;

          const doctor = await this.loadDoctor(tx, request.doctorId);
          // In-clinic: the clinic whose schedule has this time free, unless the admin chose one
          const clinics =
            request.serviceMode === ConsultationServiceMode.IN_CLINIC && !request.clinicId ? doctor.clinics.map((c) => c.id) : [request.clinicId];
          let chosen: { clinic: DoctorForBooking['clinics'][number] | null; fee: number; slot: Slot } | null = null;
          for (const clinicId of clinics) {
            let service: ReturnType<AppointmentsService['resolveService']>;
            try {
              service = this.resolveService(doctor, request.serviceMode, clinicId);
            } catch (e) {
              if (clinics.length === 1) throw e;
              continue; // e.g. a clinic without a fee
            }
            const slot = (await this.freeSlots(tx, doctor.id, date, service.windows)).find((x) => x.start === start);
            if (slot) {
              chosen = { clinic: service.clinic, fee: service.fee, slot };
              break;
            }
          }
          if (!chosen) {
            throw new ConflictException(`${doctor.fullName} is not free at ${request.startTime} on ${date}. Please choose another time.`);
          }

          if (source.intakeId) {
            // The details belong to one booking at a time: release them from the cancelled one
            await tx.appointment.updateMany({
              where: { intakeId: source.intakeId, status: AppointmentStatus.CANCELLED },
              data: { intakeId: null },
            });
          }

          const appointment = await this.createWithUniqueNumber(tx, {
            userId: source.userId,
            doctorId: doctor.id,
            clinicId: chosen.clinic?.id ?? null,
            intakeId: source.intakeId,
            patientType: source.patientType,
            familyMemberId: source.familyMemberId,
            serviceMode: request.serviceMode,
            appointmentDate: dateOnly(date),
            startTime: chosen.slot.startTime,
            endTime: chosen.slot.endTime,
            fee: chosen.fee,
            paymentMethod: source.paymentMethod,
            status: AppointmentStatus.PENDING,
          });
          if (source.intakeId) {
            await tx.consultationIntake.update({
              where: { id: source.intakeId },
              data: { status: IntakeStatus.DOCTOR_ASSIGNED, serviceMode: request.serviceMode },
            });
          }
          return appointment;
        },
        { timeout: 15_000 },
      );

    for (let attempt = 1; ; attempt++) {
      try {
        return await book();
      } catch (error) {
        const { code, meta } = (error ?? {}) as { code?: string; meta?: { target?: unknown } };
        if (code !== 'P2002') throw error;
        if (String(meta?.target ?? '').includes('intake')) {
          throw new ConflictException('These consultation details are already part of another active booking.');
        }
        if (attempt >= 3) throw new ConflictException('Could not create the appointment. Please try again.');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Admin: another doctor's free times (alternative-doctor finder)
  // ---------------------------------------------------------------------------

  /**
   * Free times of one doctor on `date` for a consultation type (every clinic
   * for in-clinic visits). Empty when the doctor doesn't offer that type.
   */
  async freeTimesForDoctor(doctorId: string, mode: ConsultationServiceMode, date: string) {
    const doctor = await this.loadDoctor(this.prisma, doctorId, false);
    const sources: { clinicId: string | null; windows: { dayOfWeek: string; startTime: string; endTime: string }[] }[] =
      mode === ConsultationServiceMode.IN_CLINIC
        ? doctor.clinics.map((c) => ({ clinicId: c.id, windows: c.schedules }))
        : (mode === ConsultationServiceMode.VIDEO ? doctor.isVideoCallEnabled : doctor.isTextConsultEnabled)
          ? [{ clinicId: null, windows: doctor.onlineAvailabilities }]
          : [];
    const out: { clinicId: string | null; startTime: string; endTime: string }[] = [];
    for (const source of sources) {
      for (const slot of await this.freeSlots(this.prisma, doctor.id, date, source.windows)) {
        out.push({ clinicId: source.clinicId, startTime: slot.startTime, endTime: slot.endTime });
      }
    }
    return out;
  }

  private assertBookableDate(date: string) {
    if (Number.isNaN(dateOnly(date).getTime()) || !dateOnly(date).toISOString().startsWith(date)) {
      throw new BadRequestException('That date does not exist');
    }
    const ahead = daysBetween(nowInAppZone().date, date);
    if (ahead < 0) throw new BadRequestException('You can only book today or a future date');
    if (ahead > MAX_DAYS_AHEAD) {
      throw new BadRequestException(`Appointments can be booked up to ${MAX_DAYS_AHEAD} days ahead`);
    }
  }

  private async loadDoctor(db: Db, doctorId: string, requireApproved = true): Promise<DoctorForBooking> {
    const scheduleSelect = { select: { dayOfWeek: true, startTime: true, endTime: true } };
    const doctor = await db.doctor.findUnique({
      where: { id: doctorId },
      select: {
        ...DOCTOR_PUBLIC_SELECT,
        status: true,
        isActive: true,
        onlineAvailabilities: scheduleSelect,
        clinics: {
          select: { ...CLINIC_PUBLIC_SELECT, schedules: scheduleSelect },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (requireApproved && (doctor.status !== DoctorStatus.APPROVED || !doctor.isActive)) {
      throw new BadRequestException('This doctor is not accepting appointments right now');
    }
    return doctor;
  }

  /** Fee, clinic and schedule windows for the requested mode. */
  private resolveService(
    doctor: DoctorForBooking,
    mode: ConsultationServiceMode,
    clinicId: string | undefined,
  ) {
    let windows: { dayOfWeek: string; startTime: string; endTime: string }[];
    let clinic: DoctorForBooking['clinics'][number] | null = null;
    let fee: number | null | undefined;

    if (mode === ConsultationServiceMode.IN_CLINIC) {
      if (doctor.clinics.length === 0) {
        throw new BadRequestException('This doctor does not see patients at a clinic');
      }
      // A doctor with one clinic doesn't need clinicId
      clinic = clinicId
        ? doctor.clinics.find((c) => c.id === clinicId) ?? null
        : doctor.clinics.length === 1
          ? doctor.clinics[0]
          : null;
      if (!clinic) {
        throw new BadRequestException(
          clinicId ? 'This clinic does not belong to the selected doctor' : 'Please choose a clinic',
        );
      }
      windows = clinic.schedules;
      fee = clinic.inPersonFee;
    } else if (mode === ConsultationServiceMode.VIDEO) {
      if (!doctor.isVideoCallEnabled) throw new BadRequestException('This doctor does not offer video calls');
      windows = doctor.onlineAvailabilities;
      fee = doctor.videoCallFee;
    } else {
      if (!doctor.isTextConsultEnabled) {
        throw new BadRequestException('This doctor does not offer text appointments');
      }
      windows = doctor.onlineAvailabilities;
      fee = doctor.textConsultFee;
    }

    if (fee == null || fee < 0) {
      throw new BadRequestException('This doctor has not set a fee for this consultation type yet');
    }

    const workingDays = WEEK_DAYS.filter((d) => windows.some((w) => w.dayOfWeek === d));
    return { clinic, fee, windows, workingDays };
  }

  /** Slots on `date` inside the schedule, minus booked and already-passed ones. */
  private async freeSlots(
    db: Db,
    doctorId: string,
    date: string,
    windows: { dayOfWeek: string; startTime: string; endTime: string }[],
    /** an appointment whose own slot should count as free (when moving it) */
    ignoreAppointmentId?: string,
  ): Promise<Slot[]> {
    const day = dayOfWeek(date);
    const all = buildSlots(windows.filter((w) => w.dayOfWeek === day));
    if (all.length === 0) return [];

    // The doctor can't be in two places: block a time across every mode and clinic
    const booked = await db.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: dateOnly(date),
        status: { in: ACTIVE_STATUSES },
        ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      },
      select: { startTime: true, endTime: true },
    });
    const taken = booked
      .map((b) => ({ from: toMinutes(b.startTime), to: toMinutes(b.endTime) }))
      .filter((b): b is { from: number; to: number } => b.from != null && b.to != null);

    const now = nowInAppZone();
    const minStart = now.date === date ? now.minutes + 1 : -1;

    return all.filter(
      (s) =>
        s.start >= minStart &&
        !taken.some((b) => s.start < (b.to > b.from ? b.to : b.from + SLOT_MINUTES) && s.start + SLOT_MINUTES > b.from),
    );
  }

  private publicClinic(c: DoctorForBooking['clinics'][number]) {
    const { schedules, ...rest } = c;
    return { ...rest, workingDays: WEEK_DAYS.filter((d) => schedules.some((s) => s.dayOfWeek === d)) };
  }

  /** "APT-202610-8492"; retries on the rare clash with an existing number. */
  private async createWithUniqueNumber(
    tx: Prisma.TransactionClient,
    data: Omit<Prisma.AppointmentUncheckedCreateInput, 'appointmentNum'>,
  ) {
    const d = dateOnly(nowInAppZone().date);
    const prefix = `APT-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    for (let attempt = 0; attempt < 6; attempt++) {
      const digits = attempt < 4 ? 4 : 6;
      const appointmentNum = `${prefix}-${randomInt(10 ** (digits - 1), 10 ** digits)}`;
      const exists = await tx.appointment.findUnique({ where: { appointmentNum }, select: { id: true } });
      if (exists) continue;
      return tx.appointment.create({ data: { ...data, appointmentNum }, include: APPOINTMENT_INCLUDE });
    }
    throw new ConflictException('Could not create an appointment number. Please try again.');
  }
}

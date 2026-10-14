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

    if (dto.intakeId) {
      const intake = await this.prisma.consultationIntake.findFirst({
        where: { id: dto.intakeId, userId },
        select: { id: true, status: true, appointment: { select: { appointmentNum: true } } },
      });
      if (!intake) throw new NotFoundException('Consultation details not found');
      if (intake.appointment) {
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

    this.logger.log(`Appointment ${result.appointmentNum} booked for doctor ${dto.doctorId} on ${date} ${result.startTime}`);
    return result;
  }

  // ---------------------------------------------------------------------------
  // GET /appointments/:id and GET /appointments (patient's own)
  // ---------------------------------------------------------------------------

  async findOne(userId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, userId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async findForUser(userId: string) {
    return this.prisma.appointment.findMany({
      where: { userId },
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ appointmentDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

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

  private async loadDoctor(db: Db, doctorId: string): Promise<DoctorForBooking> {
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
    if (doctor.status !== DoctorStatus.APPROVED || !doctor.isActive) {
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
  ): Promise<Slot[]> {
    const day = dayOfWeek(date);
    const all = buildSlots(windows.filter((w) => w.dayOfWeek === day));
    if (all.length === 0) return [];

    // The doctor can't be in two places: block a time across every mode and clinic
    const booked = await db.appointment.findMany({
      where: { doctorId, appointmentDate: dateOnly(date), status: { in: ACTIVE_STATUSES } },
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

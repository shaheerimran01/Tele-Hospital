import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { DoctorStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  DAYS_OF_WEEK,
  RegisterDoctorDto,
  timeToMinutes,
  type DoctorAvailabilityDto,
} from './dto/register-doctor.dto.js';
import { GetDoctorsQueryDto } from './dto/get-doctors-query.dto.js';
import { UpdateDoctorStatusDto } from './dto/update-doctor-status.dto.js';
import { SendDoctorOtpDto, VerifyDoctorOtpDto } from './dto/auth-doctor.dto.js';
import { GetNearbyDoctorsDto } from './dto/get-nearby-doctors.dto.js';
import {
  DOCTOR_PORTAL_NOTIFICATION_TYPES,
  recordDoctorPortalNotification,
} from '../doctor-admin/doctor-portal-notifications.js';
import {
  doctorOtpKey,
  doctorPhoneVariants,
  formatDoctorPhone,
  maskEmail,
  signDoctorToken,
  type DoctorTokenPayload,
} from './doctor-auth.js';

const DEFAULT_LIMIT = 50;
const DEFAULT_RADIUS_KM = 10;

const OTP_TTL_MINUTES = 5;
const OTP_RESEND_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;

/** Relations returned with every doctor profile. */
const DOCTOR_PROFILE_INCLUDE = {
  clinics: {
    include: { schedules: true },
    orderBy: { createdAt: 'asc' },
  },
  onlineAvailabilities: true,
} satisfies Prisma.DoctorInclude;

export interface PatientLocation {
  latitude: number;
  longitude: number;
  /** e.g. "Blue Area, Islamabad" */
  label: string | null;
}

export interface NearestClinic {
  id: string;
  name: string;
  address: string;
  inPersonFee: number;
  distanceKm: number;
}

type DoctorWithRelations = Prisma.DoctorGetPayload<{
  include: typeof DOCTOR_PROFILE_INCLUDE;
}>;

@Injectable()
export class DoctorsService {
  /** Wrong-OTP counter per phone (in memory; resets when the API restarts). */
  private readonly otpAttempts = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Doctor auth: POST /doctors/auth/send-otp
  // ---------------------------------------------------------------------------

  async sendOtp(dto: SendDoctorOtpDto) {
    const phone = formatDoctorPhone(dto.phone);
    const key = doctorOtpKey(phone);

    // Stop rapid re-sends (and SMS cost later): one OTP per 30 seconds
    const recent = await this.prisma.otpSession.findFirst({
      where: { phone: key, createdAt: { gt: new Date(Date.now() - OTP_RESEND_SECONDS * 1000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const wait = Math.ceil(
        (recent.createdAt.getTime() + OTP_RESEND_SECONDS * 1000 - Date.now()) / 1000,
      );
      throw new BadRequestException(`Please wait ${Math.max(wait, 1)} seconds before requesting a new OTP.`);
    }

    const otp = randomInt(100000, 1000000).toString();
    await this.prisma.otpSession.create({
      data: { phone: key, otp, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000) },
    });
    this.otpAttempts.delete(key);

    // DEV: no SMS provider yet, so the OTP is printed in the API terminal
    console.log(`\n==============================`);
    console.log(`🩺 Doctor OTP for ${phone}: ${otp}`);
    console.log(`==============================\n`);

    const { registration, doctor } = await this.findDoctorAccount(phone);
    return {
      success: true,
      phone,
      exists: Boolean(registration || doctor),
      email: maskEmail(registration?.email ?? doctor?.email),
      resendAfterSeconds: OTP_RESEND_SECONDS,
    };
  }

  // ---------------------------------------------------------------------------
  // Doctor auth: POST /doctors/auth/verify-otp
  // ---------------------------------------------------------------------------

  async verifyOtp(dto: VerifyDoctorOtpDto) {
    const phone = formatDoctorPhone(dto.phone);
    const key = doctorOtpKey(phone);

    const session = await this.prisma.otpSession.findFirst({
      where: { phone: key, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) throw new BadRequestException('No OTP found. Please request a new one.');
    if (session.expiresAt < new Date()) {
      throw new BadRequestException('This OTP has expired. Please request a new one.');
    }

    const given = Buffer.from(dto.otp);
    const expected = Buffer.from(session.otp);
    const matches = given.length === expected.length && timingSafeEqual(given, expected);

    if (!matches) {
      const attempts = (this.otpAttempts.get(key) ?? 0) + 1;
      this.otpAttempts.set(key, attempts);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        // Burn the code so it can't be brute-forced
        await this.prisma.otpSession.update({ where: { id: session.id }, data: { verifiedAt: new Date() } });
        this.otpAttempts.delete(key);
        throw new BadRequestException('Too many wrong attempts. Please request a new OTP.');
      }
      throw new BadRequestException(
        `Incorrect OTP. ${OTP_MAX_ATTEMPTS - attempts} attempt${OTP_MAX_ATTEMPTS - attempts === 1 ? '' : 's'} left.`,
      );
    }

    await this.prisma.otpSession.update({ where: { id: session.id }, data: { verifiedAt: new Date() } });
    this.otpAttempts.delete(key);

    let { registration, doctor } = await this.findDoctorAccount(phone);

    if (!registration) {
      registration = await this.prisma.doctorRegistration.create({
        data: { phone, isFormFilled: Boolean(doctor), status: doctor?.status ?? 'PENDING' },
      });
    } else if (doctor && !registration.isFormFilled) {
      // Profile was submitted before this login flow existed
      registration = await this.prisma.doctorRegistration.update({
        where: { id: registration.id },
        data: { isFormFilled: true, status: doctor.status },
      });
    }

    const isFormFilled = registration.isFormFilled || Boolean(doctor);
    return {
      success: true,
      token: signDoctorToken(registration.id, phone),
      isFormFilled,
      doctorRegistration: this.toPublicRegistration(registration, doctor),
    };
  }

  // ---------------------------------------------------------------------------
  // Doctor auth: GET /doctors/auth/me
  // ---------------------------------------------------------------------------

  async getMe(auth: DoctorTokenPayload) {
    const registration = await this.prisma.doctorRegistration.findUnique({ where: { id: auth.sub } });
    if (!registration) {
      throw new UnauthorizedException('Doctor account not found. Please verify your phone again.');
    }
    const doctor = await this.prisma.doctor.findFirst({
      where: { phone: { in: doctorPhoneVariants(registration.phone) } },
      include: DOCTOR_PROFILE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return {
      isFormFilled: registration.isFormFilled || Boolean(doctor),
      doctorRegistration: this.toPublicRegistration(registration, doctor),
      doctor: doctor ? this.sortSlots(doctor) : null,
    };
  }

  /**
   * The doctor profile behind a doctor login token (doctor-only endpoints).
   * Throws 401 when the login is gone and 403 when the profile isn't submitted yet.
   */
  async resolveDoctorForAuth(auth: DoctorTokenPayload) {
    const registration = await this.prisma.doctorRegistration.findUnique({ where: { id: auth.sub } });
    if (!registration) {
      throw new UnauthorizedException('Doctor account not found. Please verify your phone again.');
    }
    const doctor = await this.prisma.doctor.findFirst({
      where: { phone: { in: doctorPhoneVariants(registration.phone) } },
      select: { id: true, fullName: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!doctor) {
      throw new ForbiddenException('Please complete your doctor profile first.');
    }
    return doctor;
  }

  /** Registration + doctor profile for a phone, matching older unformatted rows too. */
  private async findDoctorAccount(phone: string) {
    const variants = doctorPhoneVariants(phone);
    const [registration, doctor] = await Promise.all([
      this.prisma.doctorRegistration.findFirst({ where: { phone: { in: variants } } }),
      this.prisma.doctor.findFirst({
        where: { phone: { in: variants } },
        select: { id: true, email: true, status: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { registration, doctor };
  }

  private toPublicRegistration(
    registration: { id: string; phone: string; email: string | null; isFormFilled: boolean; status: string },
    doctor?: { id: string; status: string } | null,
  ) {
    return {
      id: registration.id,
      phone: registration.phone,
      email: registration.email,
      isFormFilled: registration.isFormFilled || Boolean(doctor),
      // The doctor profile's status is the source of truth once it exists
      status: doctor?.status ?? registration.status,
      doctorId: doctor?.id ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // POST /doctors/register  (requires doctor token)
  // ---------------------------------------------------------------------------

  async register(dto: RegisterDoctorDto, auth: DoctorTokenPayload) {
    this.assertRegistrationRules(dto);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const registration = await tx.doctorRegistration.findUnique({ where: { id: auth.sub } });
        if (!registration) {
          throw new UnauthorizedException('Doctor account not found. Please verify your phone again.');
        }

        const variants = doctorPhoneVariants(registration.phone);
        const alreadyHasProfile = await tx.doctor.findFirst({
          where: { phone: { in: variants } },
          select: { id: true },
        });
        if (registration.isFormFilled || alreadyHasProfile) {
          throw new ConflictException('You have already submitted your registration.');
        }

        const existingPmdc = await tx.doctor.findUnique({
          where: { pmdcNumber: dto.pmdcNumber },
          select: { id: true },
        });
        if (existingPmdc) {
          throw new ConflictException('A doctor with this PMDC number is already registered.');
        }

        const doctor = await tx.doctor.create({
          data: {
            fullName: dto.fullName,
            title: dto.title,
            degrees: dto.degrees,
            pmdcNumber: dto.pmdcNumber,
            pmdcCertificateUrl: dto.pmdcCertificateUrl ?? null,
            experienceYears: dto.experienceYears,
            languages: dto.languages,
            // Always the OTP-verified number, so the profile stays linked to this login
            phone: registration.phone,
            email: dto.email ?? null,
            specialisations: dto.specialisations,
            education: dto.education ?? null,
            about: dto.about ?? null,
            profilePhotoUrl: dto.profilePhotoUrl ?? null,

            isVideoCallEnabled: dto.isVideoCallEnabled,
            videoCallFee: dto.isVideoCallEnabled ? dto.videoCallFee : null,
            isTextConsultEnabled: dto.isTextConsultEnabled,
            textConsultFee: dto.isTextConsultEnabled ? dto.textConsultFee : null,

            status: DoctorStatus.PENDING,

            clinics: {
              create: (dto.clinics ?? []).map((clinic) => ({
                name: clinic.name,
                phone: clinic.phone ?? null,
                inPersonFee: clinic.inPersonFee,
                address: clinic.address,
                latitude: clinic.latitude ?? null,
                longitude: clinic.longitude ?? null,
                schedules: {
                  create: (clinic.schedules ?? []).map((s) => ({
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                  })),
                },
              })),
            },

            onlineAvailabilities: {
              create: (dto.onlineAvailabilities ?? []).map((s) => ({
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
              })),
            },
          },
          include: DOCTOR_PROFILE_INCLUDE,
        });

        // Keep the email on the registration too, unless another doctor already uses it
        let email = registration.email;
        if (dto.email && !registration.email) {
          const taken = await tx.doctorRegistration.findFirst({
            where: { email: dto.email, id: { not: registration.id } },
            select: { id: true },
          });
          if (!taken) email = dto.email;
        }

        const updatedRegistration = await tx.doctorRegistration.update({
          where: { id: registration.id },
          data: { isFormFilled: true, status: 'PENDING', email },
        });

        return { doctor, registration: updatedRegistration };
      });

      // Tell the admin Doctor Portal a profile is waiting for PMDC verification
      await recordDoctorPortalNotification(this.prisma, {
        type: DOCTOR_PORTAL_NOTIFICATION_TYPES.DOCTOR_REGISTRATION,
        title: 'New doctor registration',
        message: `${result.doctor.fullName} submitted PMDC verification (PMDC ${result.doctor.pmdcNumber}).`,
      });

      return {
        success: true,
        message: 'Registration submitted for admin approval',
        isFormFilled: true,
        doctorRegistration: this.toPublicRegistration(result.registration, result.doctor),
        doctor: this.sortSlots(result.doctor),
      };
    } catch (error) {
      // Two submissions racing each other on the same PMDC number / email
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('A doctor with this PMDC number is already registered.');
      }
      throw error;
    }
  }

  /** Rules that span several fields, checked before touching the database. */
  private assertRegistrationRules(dto: RegisterDoctorDto) {
    const errors: string[] = [];
    const clinics = dto.clinics ?? [];
    const online = dto.onlineAvailabilities ?? [];

    if (!dto.isVideoCallEnabled && !dto.isTextConsultEnabled && clinics.length === 0) {
      errors.push(
        'Enable at least one consultation type: video call, text consult or an in-person clinic.',
      );
    }

    if (dto.isVideoCallEnabled && dto.videoCallFee == null) {
      errors.push('videoCallFee is required when video call is enabled.');
    }
    if (dto.isTextConsultEnabled && dto.textConsultFee == null) {
      errors.push('textConsultFee is required when text consult is enabled.');
    }

    if ((dto.isVideoCallEnabled || dto.isTextConsultEnabled) && online.length === 0) {
      errors.push(
        'Add at least one online availability slot for video / text consultations.',
      );
    }
    errors.push(...this.validateSlots(online, 'Online availability'));

    clinics.forEach((clinic, i) => {
      const label = `Clinic "${clinic.name || i + 1}"`;
      if ((clinic.latitude == null) !== (clinic.longitude == null)) {
        errors.push(`${label}: send latitude and longitude together.`);
      }
      if (!clinic.schedules || clinic.schedules.length === 0) {
        errors.push(`${label}: add at least one schedule (day and timings).`);
      }
      errors.push(...this.validateSlots(clinic.schedules ?? [], label));
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  /** End must be after start, and slots on the same day must not overlap. */
  private validateSlots(slots: DoctorAvailabilityDto[], label: string): string[] {
    const errors: string[] = [];
    const byDay = new Map<string, { start: number; end: number; text: string }[]>();

    for (const slot of slots) {
      const start = timeToMinutes(slot.startTime);
      const end = timeToMinutes(slot.endTime);
      const text = `${slot.dayOfWeek} ${slot.startTime} - ${slot.endTime}`;
      if (end <= start) {
        errors.push(`${label}: end time must be after start time (${text}).`);
        continue;
      }
      const list = byDay.get(slot.dayOfWeek) ?? [];
      list.push({ start, end, text });
      byDay.set(slot.dayOfWeek, list);
    }

    for (const list of byDay.values()) {
      list.sort((a, b) => a.start - b.start);
      for (let i = 1; i < list.length; i++) {
        if (list[i].start < list[i - 1].end) {
          errors.push(`${label}: overlapping timings (${list[i - 1].text} and ${list[i].text}).`);
        }
      }
    }
    return errors;
  }

  // ---------------------------------------------------------------------------
  // GET /doctors
  // ---------------------------------------------------------------------------

  async findAll(query: GetDoctorsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const status = query.status ?? DoctorStatus.APPROVED;
    const hasLocation = query.lat !== undefined && query.lng !== undefined;
    const radiusKm = query.radiusKm ?? DEFAULT_RADIUS_KM;

    const and: Prisma.DoctorWhereInput[] = [];

    if (status !== 'ALL') {
      and.push({ status: status as DoctorStatus });
    }
    // The public listing only shows active profiles
    if (status === DoctorStatus.APPROVED) {
      and.push({ isActive: true });
    }

    if (query.search) {
      and.push({
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { degrees: { contains: query.search, mode: 'insensitive' } },
          { title: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.speciality) {
      and.push(await this.buildSpecialityFilter(query.speciality));
    }

    if (query.consultationType === 'VIDEO') and.push({ isVideoCallEnabled: true });
    if (query.consultationType === 'TEXT') and.push({ isTextConsultEnabled: true });
    if (query.consultationType === 'IN_CLINIC') and.push({ clinics: { some: {} } });

    if (query.city) {
      and.push({
        clinics: { some: { address: { contains: query.city, mode: 'insensitive' } } },
      });
    }

    if (hasLocation) {
      // Cheap bounding-box filter in the database; exact distance is checked below
      const box = this.boundingBox(query.lat!, query.lng!, radiusKm);
      and.push({
        clinics: {
          some: {
            latitude: { gte: box.minLat, lte: box.maxLat },
            longitude: { gte: box.minLng, lte: box.maxLng },
          },
        },
      });
    }

    const where: Prisma.DoctorWhereInput = { AND: and };
    const omit = { pmdcCertificateUrl: true } as const;

    if (!hasLocation) {
      const doctors = await this.prisma.doctor.findMany({
        where,
        include: DOCTOR_PROFILE_INCLUDE,
        omit,
        orderBy: [{ experienceYears: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      });
      return doctors.map((d) => this.sortSlots(d));
    }

    // Location search: compute distance to the nearest clinic, filter, sort, paginate
    const candidates = await this.prisma.doctor.findMany({
      where,
      include: DOCTOR_PROFILE_INCLUDE,
      omit,
    });

    return candidates
      .map((doctor) => {
        const distances = doctor.clinics
          .filter((c) => c.latitude != null && c.longitude != null)
          .map((c) => this.distanceKm(query.lat!, query.lng!, c.latitude!, c.longitude!));
        const distanceKm = distances.length ? Math.min(...distances) : Infinity;
        return { ...this.sortSlots(doctor), distanceKm: Math.round(distanceKm * 10) / 10 };
      })
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice((page - 1) * limit, page * limit);
  }

  /**
   * Accepts a Speciality id, slug or name. Doctor specialisations are free text,
   * so this matches the exact phrase (in common casings) or the doctor's title.
   */
  private async buildSpecialityFilter(input: string): Promise<Prisma.DoctorWhereInput> {
    const speciality = await this.prisma.speciality.findFirst({
      where: {
        OR: [
          { id: input },
          { slug: input.toLowerCase() },
          { name: { equals: input, mode: 'insensitive' } },
        ],
      },
      select: { name: true },
    });

    const terms = Array.from(new Set([input, speciality?.name].filter(Boolean) as string[]));

    const casings = new Set<string>();
    for (const t of terms) {
      casings.add(t);
      casings.add(t.toLowerCase());
      casings.add(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
      casings.add(t.replace(/\b\w/g, (c) => c.toUpperCase()));
    }

    // "Dermatologist" -> "Dermatolog" so it also matches "Dermatology" in titles
    const stems = terms.map((t) =>
      t.length > 6 ? t.replace(/(ists?|ians?|ics?|y)$/i, '') : t,
    );

    return {
      OR: [
        { specialisations: { hasSome: Array.from(casings) } },
        ...Array.from(new Set([...terms, ...stems])).map((t) => ({
          title: { contains: t, mode: 'insensitive' as const },
        })),
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // GET /doctors/nearby  (patient flow: doctors sorted by distance)
  // ---------------------------------------------------------------------------

  async findNearby(query: GetNearbyDoctorsDto) {
    const limit = query.limit ?? DEFAULT_LIMIT;

    // 1. Patient location + speciality from the intake (if given)
    let intakeLocation: PatientLocation | null = null;
    let specialityId = query.specialityId;

    if (query.intakeId) {
      const intake = await this.prisma.consultationIntake.findFirst({
        where: { id: query.intakeId, ...(query.userId ? { userId: query.userId } : {}) },
        select: { userId: true, specialityId: true, patientAddress: true },
      });
      // The intake holds the patient's address, so it must belong to the caller
      if (!intake || !query.userId) {
        throw new NotFoundException('Consultation request not found');
      }
      intakeLocation = this.readPatientLocation(intake.patientAddress);
      specialityId = specialityId ?? intake.specialityId;
    }

    const location: PatientLocation | null =
      query.lat !== undefined && query.lng !== undefined
        ? { latitude: query.lat, longitude: query.lng, label: intakeLocation?.label ?? null }
        : intakeLocation;

    // 2. Speciality filter
    let speciality: { id: string; name: string } | null = null;
    if (specialityId && !query.allSpecialities) {
      speciality = await this.prisma.speciality.findFirst({
        where: { OR: [{ id: specialityId }, { slug: specialityId }] },
        select: { id: true, name: true },
      });
    }

    const and: Prisma.DoctorWhereInput[] = [{ status: DoctorStatus.APPROVED }, { isActive: true }];
    if (speciality) and.push(await this.buildSpecialityFilter(speciality.name));
    if (query.serviceMode === 'VIDEO') and.push({ isVideoCallEnabled: true });
    if (query.serviceMode === 'TEXT') and.push({ isTextConsultEnabled: true });
    if (query.serviceMode === 'IN_CLINIC') and.push({ clinics: { some: {} } });

    const doctors = await this.prisma.doctor.findMany({
      where: { AND: and },
      include: DOCTOR_PROFILE_INCLUDE,
      // Public listing: no contact details or documents
      omit: { pmdcCertificateUrl: true, phone: true, email: true, userId: true },
    });

    // 3. Distance to each clinic (Haversine), nearest clinic per doctor
    const ranked = doctors.map((doctor) => {
      let nearestClinic: NearestClinic | null = null;

      if (location) {
        for (const clinic of doctor.clinics) {
          if (clinic.latitude == null || clinic.longitude == null) continue;
          const km = this.distanceKm(location.latitude, location.longitude, clinic.latitude, clinic.longitude);
          if (!nearestClinic || km < nearestClinic.distanceKm) {
            nearestClinic = {
              id: clinic.id,
              name: clinic.name,
              address: clinic.address,
              inPersonFee: clinic.inPersonFee,
              distanceKm: Math.round(km * 10) / 10,
            };
          }
        }
      }

      const sorted = this.sortSlots(doctor);
      return {
        ...sorted,
        nearestClinic,
        minDistanceKm: nearestClinic?.distanceKm ?? null,
        // Cheapest in-person fee across clinics, for price filters on the client
        minInPersonFee: doctor.clinics.length
          ? Math.min(...doctor.clinics.map((c) => c.inPersonFee))
          : null,
      };
    });

    // 4. Optional radius, then nearest first. Doctors without a mapped clinic
    //    (online-only, or no pin) come last, most experienced first.
    const inRange =
      query.radiusKm && location
        ? ranked.filter((d) => d.minDistanceKm != null && d.minDistanceKm <= query.radiusKm!)
        : ranked;

    inRange.sort((a, b) => {
      if (a.minDistanceKm != null && b.minDistanceKm != null) return a.minDistanceKm - b.minDistanceKm;
      if (a.minDistanceKm != null) return -1;
      if (b.minDistanceKm != null) return 1;
      return b.experienceYears - a.experienceYears;
    });

    return {
      patientLocation: location,
      speciality,
      total: inRange.length,
      doctors: inRange.slice(0, limit),
    };
  }

  /** Reads { latitude, longitude, area, city } from the intake's address snapshot. */
  private readPatientLocation(snapshot: unknown): PatientLocation | null {
    if (!snapshot || typeof snapshot !== 'object') return null;
    const a = snapshot as Record<string, unknown>;
    const lat = typeof a.latitude === 'number' ? a.latitude : Number(a.latitude);
    const lng = typeof a.longitude === 'number' ? a.longitude : Number(a.longitude);
    const label = [a.area, a.city].filter((x): x is string => typeof x === 'string' && x.trim() !== '').join(', ') || null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || a.latitude == null || a.longitude == null) {
      return null;
    }
    return { latitude: lat, longitude: lng, label };
  }

  // ---------------------------------------------------------------------------
  // GET /doctors/:id
  // ---------------------------------------------------------------------------

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: DOCTOR_PROFILE_INCLUDE,
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    return this.sortSlots(doctor);
  }

  // ---------------------------------------------------------------------------
  // PATCH /doctors/:id/status
  // ---------------------------------------------------------------------------

  async updateStatus(id: string, dto: UpdateDoctorStatusDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      select: { id: true, phone: true },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.doctor.update({
        where: { id },
        data: { status: dto.status },
        include: DOCTOR_PROFILE_INCLUDE,
      }),
      // Keep the login record in step so the doctor dashboard shows the same status
      this.prisma.doctorRegistration.updateMany({
        where: { phone: { in: doctorPhoneVariants(doctor.phone) } },
        data: { status: dto.status },
      }),
    ]);
    return this.sortSlots(updated);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Orders clinic schedules and online slots Monday -> Sunday, then by start time. */
  private sortSlots<
    T extends Pick<DoctorWithRelations, 'clinics' | 'onlineAvailabilities'>,
  >(doctor: T): T {
    const order = (a: { dayOfWeek: string; startTime: string }, b: { dayOfWeek: string; startTime: string }) => {
      const day =
        DAYS_OF_WEEK.indexOf(a.dayOfWeek as (typeof DAYS_OF_WEEK)[number]) -
        DAYS_OF_WEEK.indexOf(b.dayOfWeek as (typeof DAYS_OF_WEEK)[number]);
      return day !== 0 ? day : timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    };

    return {
      ...doctor,
      clinics: doctor.clinics.map((c) => ({ ...c, schedules: [...c.schedules].sort(order) })),
      onlineAvailabilities: [...doctor.onlineAvailabilities].sort(order),
    };
  }

  private boundingBox(lat: number, lng: number, radiusKm: number) {
    const latDelta = radiusKm / 111.32;
    const lngDelta = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    };
  }

  /** Haversine distance in kilometres. */
  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
}

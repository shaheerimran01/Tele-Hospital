import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

const DEFAULT_LIMIT = 50;
const DEFAULT_RADIUS_KM = 10;

/** Relations returned with every doctor profile. */
const DOCTOR_PROFILE_INCLUDE = {
  clinics: {
    include: { schedules: true },
    orderBy: { createdAt: 'asc' },
  },
  onlineAvailabilities: true,
} satisfies Prisma.DoctorInclude;

type DoctorWithRelations = Prisma.DoctorGetPayload<{
  include: typeof DOCTOR_PROFILE_INCLUDE;
}>;

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // POST /doctors/register
  // ---------------------------------------------------------------------------

  async register(dto: RegisterDoctorDto, userId?: string) {
    this.assertRegistrationRules(dto);

    try {
      const doctor = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.doctor.findUnique({
          where: { pmdcNumber: dto.pmdcNumber },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException(
            'A doctor with this PMDC number is already registered.',
          );
        }

        // Optional link to the logged-in user's account
        if (userId) {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, doctor: { select: { id: true } } },
          });
          if (!user) {
            throw new BadRequestException('User account not found. Please log in again.');
          }
          if (user.doctor) {
            throw new ConflictException(
              'This account already has a doctor profile.',
            );
          }
        }

        return tx.doctor.create({
          data: {
            userId: userId ?? null,

            fullName: dto.fullName,
            title: dto.title,
            degrees: dto.degrees,
            pmdcNumber: dto.pmdcNumber,
            pmdcCertificateUrl: dto.pmdcCertificateUrl ?? null,
            experienceYears: dto.experienceYears,
            languages: dto.languages,
            phone: dto.phone,
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
      });

      return this.sortSlots(doctor);
    } catch (error) {
      // Two registrations with the same PMDC number / user racing each other
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException(
          'A doctor with this PMDC number or account is already registered.',
        );
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
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: { status: dto.status },
      include: DOCTOR_PROFILE_INCLUDE,
    });
    return this.sortSlots(updated);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Orders clinic schedules and online slots Monday -> Sunday, then by start time. */
  private sortSlots<T extends Omit<DoctorWithRelations, 'pmdcCertificateUrl'>>(doctor: T): T {
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

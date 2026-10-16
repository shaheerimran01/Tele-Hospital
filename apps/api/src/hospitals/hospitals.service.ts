import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DoctorStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  CreateHospitalDto,
  ListHospitalsQueryDto,
  NearbyHospitalsQueryDto,
  UpdateHospitalDto,
} from './dto/hospital.dto.js';

const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE_SIZE = 20;
/** A doctor's clinic this close to a hospital counts as "at" that hospital */
const SAME_PLACE_KM = 0.3;
/** Shorter hospital names are too generic to match by name alone */
const MIN_NAME_MATCH_LENGTH = 6;

const HOSPITAL_SELECT = {
  id: true,
  name: true,
  city: true,
  type: true,
  address: true,
  contact: true,
  latitude: true,
  longitude: true,
  emergency: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HospitalSelect;

type HospitalRow = Prisma.HospitalGetPayload<{ select: typeof HOSPITAL_SELECT }>;

const CLINIC_SELECT = {
  id: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  inPersonFee: true,
  doctor: {
    select: {
      id: true,
      fullName: true,
      title: true,
      specialisations: true,
      profilePhotoUrl: true,
      experienceYears: true,
    },
  },
} satisfies Prisma.DoctorClinicSelect;

type ClinicRow = Prisma.DoctorClinicGetPayload<{ select: typeof CLINIC_SELECT }>;

export interface PatientLocation {
  latitude: number;
  longitude: number;
  label: string | null;
}

/** "Shifa Int'l Hospital, H-8/4" -> "shifa intl hospital h 8 4" */
export function normalizeName(text: string) {
  return text
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** `needle` appears in `haystack` as whole words */
function containsWords(haystack: string, needle: string) {
  return needle.length > 0 && ` ${haystack} `.includes(` ${needle} `);
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Is this doctor's clinic at this hospital? Yes when the hospital's full name
 * appears in the clinic's name or address (or the clinic's name in the hospital's),
 * or when both are pinned within a few hundred metres of each other.
 */
export function clinicAtHospital(
  clinic: { name: string; address: string; latitude: number | null; longitude: number | null },
  hospital: { name: string; latitude: number | null; longitude: number | null },
) {
  const h = normalizeName(hospital.name);
  const c = normalizeName(clinic.name);
  if (h.length >= MIN_NAME_MATCH_LENGTH) {
    if (containsWords(c, h) || containsWords(normalizeName(clinic.address), h)) return true;
    if (c.length >= MIN_NAME_MATCH_LENGTH && containsWords(h, c)) return true;
  }
  if (clinic.latitude != null && clinic.longitude != null && hospital.latitude != null && hospital.longitude != null) {
    return distanceKm(clinic.latitude, clinic.longitude, hospital.latitude, hospital.longitude) <= SAME_PLACE_KM;
  }
  return false;
}

function matchesSpeciality(doctorSpecs: string[], target: string | null) {
  if (!target) return false;
  const t = target.toLowerCase().trim();
  return doctorSpecs.some((s) => {
    const v = s.toLowerCase().trim();
    return v.includes(t) || t.includes(v);
  });
}

@Injectable()
export class HospitalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Patient: GET /hospitals/nearby
  // ---------------------------------------------------------------------------

  async nearby(query: NearbyHospitalsQueryDto) {
    const limit = query.limit ?? DEFAULT_LIMIT;

    // Patient location (and speciality) from the consultation request, like /doctors/nearby
    let intakeLocation: PatientLocation | null = null;
    let speciality: string | null = null;
    let intakeId: string | null = null;
    if (query.intakeId) {
      const intake = await this.prisma.consultationIntake.findFirst({
        where: { id: query.intakeId, ...(query.userId ? { userId: query.userId } : {}) },
        select: { id: true, patientAddress: true, speciality: { select: { name: true } } },
      });
      // The request holds the patient's address, so it must belong to the caller
      if (!intake || !query.userId) throw new NotFoundException('Consultation request not found');
      intakeLocation = this.readPatientLocation(intake.patientAddress);
      speciality = intake.speciality?.name ?? null;
      intakeId = intake.id;
    }
    const location: PatientLocation | null =
      query.latitude !== undefined && query.longitude !== undefined
        ? { latitude: query.latitude, longitude: query.longitude, label: intakeLocation?.label ?? null }
        : intakeLocation;

    const [hospitals, clinics] = await Promise.all([
      this.prisma.hospital.findMany({ where: { isActive: true }, select: HOSPITAL_SELECT, orderBy: { name: 'asc' }, take: 2000 }),
      this.registeredClinics(),
    ]);

    let rows = hospitals.map((h) => ({
      ...this.publicHospital(h),
      distanceKm:
        location && h.latitude != null && h.longitude != null
          ? Math.round(distanceKm(location.latitude, location.longitude, h.latitude, h.longitude) * 10) / 10
          : null,
    }));
    if (location && query.radius !== undefined) rows = rows.filter((r) => r.distanceKm != null && r.distanceKm <= query.radius!);
    if (location) {
      // Nearest first; hospitals without a map pin go last
      rows.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.name.localeCompare(b.name));
    }
    const total = rows.length;
    rows = rows.slice(0, limit);

    return {
      patientLocation: location,
      speciality,
      intakeId,
      radiusKm: query.radius ?? null,
      total,
      hospitals: rows.map((r) => ({ ...r, availableDoctors: this.doctorsAt(r, clinics, speciality) })),
    };
  }

  // ---------------------------------------------------------------------------
  // Admin CRUD: /admin/hospitals
  // ---------------------------------------------------------------------------

  async list(query: ListHospitalsQueryDto) {
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.HospitalWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { city: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const total = await this.prisma.hospital.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(query.page ?? 1, pages);
    const [items, clinics] = await Promise.all([
      this.prisma.hospital.findMany({
        where,
        select: HOSPITAL_SELECT,
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.registeredClinics(),
    ]);
    return {
      items: items.map((h) => ({
        ...h,
        /** registered doctors whose clinic matches this hospital (what patients will see) */
        linkedDoctors: this.doctorsAt(h, clinics, null).map((d) => ({ id: d.id, fullName: d.fullName })),
      })),
      total,
      page,
      pageSize,
      pages,
    };
  }

  async findOne(id: string) {
    const h = await this.prisma.hospital.findUnique({ where: { id }, select: HOSPITAL_SELECT });
    if (!h) throw new NotFoundException('Hospital not found');
    return h;
  }

  create(dto: CreateHospitalDto) {
    return this.prisma.hospital.create({
      data: {
        name: dto.name,
        city: dto.city ?? null,
        type: dto.type ?? null,
        address: dto.address,
        contact: dto.contact ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        // Left out -> the database default ("24/7")
        ...(dto.emergency ? { emergency: dto.emergency } : {}),
        notes: dto.notes ?? null,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: HOSPITAL_SELECT,
    });
  }

  async update(id: string, dto: UpdateHospitalDto) {
    await this.findOne(id);
    const data: Prisma.HospitalUpdateInput = {};
    for (const key of ['name', 'city', 'type', 'address', 'contact', 'latitude', 'longitude', 'emergency', 'notes', 'isActive'] as const) {
      if (dto[key] !== undefined) (data as Record<string, unknown>)[key] = dto[key];
    }
    return this.prisma.hospital.update({ where: { id }, data, select: HOSPITAL_SELECT });
  }

  async remove(id: string) {
    const h = await this.findOne(id);
    await this.prisma.hospital.delete({ where: { id } });
    return { id, name: h.name, deleted: true };
  }

  // ---------------------------------------------------------------------------

  /** Clinics of approved, active doctors (the ones patients can book) */
  private registeredClinics() {
    return this.prisma.doctorClinic.findMany({
      where: { doctor: { status: DoctorStatus.APPROVED, isActive: true } },
      select: CLINIC_SELECT,
      take: 5000,
    });
  }

  /** Registered doctors practising at this hospital; same speciality first */
  private doctorsAt(hospital: { name: string; latitude: number | null; longitude: number | null }, clinics: ClinicRow[], speciality: string | null) {
    const seen = new Set<string>();
    const out = [];
    for (const c of clinics) {
      if (seen.has(c.doctor.id) || !clinicAtHospital(c, hospital)) continue;
      seen.add(c.doctor.id);
      out.push({
        id: c.doctor.id,
        fullName: c.doctor.fullName,
        title: c.doctor.title,
        specialisations: c.doctor.specialisations,
        profilePhotoUrl: c.doctor.profilePhotoUrl,
        experienceYears: c.doctor.experienceYears,
        /** books an in-clinic visit at this clinic */
        clinicId: c.id,
        clinicName: c.name,
        inPersonFee: c.inPersonFee,
        matchesSpeciality: matchesSpeciality(c.doctor.specialisations, speciality),
      });
    }
    return out.sort((a, b) => Number(b.matchesSpeciality) - Number(a.matchesSpeciality) || b.experienceYears - a.experienceYears);
  }

  private publicHospital(h: HospitalRow) {
    return {
      id: h.id,
      name: h.name,
      city: h.city,
      type: h.type,
      address: h.address,
      contact: h.contact,
      latitude: h.latitude,
      longitude: h.longitude,
      emergency: h.emergency,
      notes: h.notes,
    };
  }

  private readPatientLocation(snapshot: unknown): PatientLocation | null {
    if (!snapshot || typeof snapshot !== 'object') return null;
    const a = snapshot as Record<string, unknown>;
    const lat = typeof a.latitude === 'number' ? a.latitude : Number(a.latitude);
    const lng = typeof a.longitude === 'number' ? a.longitude : Number(a.longitude);
    const label = [a.area, a.city].filter((x): x is string => typeof x === 'string' && x.trim() !== '').join(', ') || null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || a.latitude == null || a.longitude == null) return null;
    return { latitude: lat, longitude: lng, label };
  }
}

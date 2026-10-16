import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { APP_TIMEZONE } from '../appointments/slot-utils.js';
import { doctorName, recordPatientNotification } from '../doctor-admin/doctor-portal-notifications.js';
import { buildPrescriptionPdf, type PrescriptionMedicine } from './prescription-pdf.js';
import type { MedicineInput, SaveConsultationPrescriptionDto } from './dto/consultation-prescription.dto.js';

/** Where the generated PDFs are written (served at /uploads/consultation-prescriptions/...) */
export const PRESCRIPTION_PDF_DIR = 'consultation-prescriptions';
export const PRESCRIPTION_PDF_PREFIX = `/uploads/${PRESCRIPTION_PDF_DIR}/`;

/** UserNotification.type for the patient */
export const PRESCRIPTION_NOTIFICATION_TYPE = 'PRESCRIPTION_UPLOADED';

/** A prescription can be written during or after the consultation */
const PRESCRIBABLE: AppointmentStatus[] = [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED];

const MODE_LABEL: Record<string, string> = {
  IN_CLINIC: 'In-clinic visit',
  VIDEO: 'Video consultation',
  TEXT: 'Text consultation',
};

const FIELD_LIMITS: Record<keyof PrescriptionMedicine, number> = {
  name: 120,
  dosage: 60,
  frequency: 60,
  duration: 60,
  instructions: 300,
};

const APPOINTMENT_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
  familyMember: { select: { fullName: true, gender: true, age: true, dateOfBirth: true, relation: true } },
  intake: { select: { symptoms: true } },
  doctor: {
    select: {
      id: true,
      fullName: true,
      title: true,
      degrees: true,
      pmdcNumber: true,
      phone: true,
      email: true,
      specialisations: true,
    },
  },
  consultationPrescription: true,
} satisfies Prisma.AppointmentInclude;

type AppointmentWithDetails = Prisma.AppointmentGetPayload<{ include: typeof APPOINTMENT_INCLUDE }>;
type PrescriptionRow = NonNullable<AppointmentWithDetails['consultationPrescription']>;

const text = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

function ageFrom(dob: Date | null, now = new Date()) {
  if (!dob) return null;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

/** Checks and cleans the medicine rows; empty rows are dropped */
export function normalizeMedicines(rows: MedicineInput[]): PrescriptionMedicine[] {
  const out: PrescriptionMedicine[] = [];
  rows.forEach((row, i) => {
    if (!row || typeof row !== 'object') throw new BadRequestException(`Medicine ${i + 1} is not valid`);
    const m = {
      name: text(row.name),
      dosage: text(row.dosage),
      frequency: text(row.frequency),
      duration: text(row.duration),
      instructions: text(row.instructions),
    };
    const filled = Object.values(m).some(Boolean);
    if (!filled) return;
    if (!m.name) throw new BadRequestException(`Enter the medicine name in row ${i + 1}`);
    for (const key of Object.keys(FIELD_LIMITS) as (keyof PrescriptionMedicine)[]) {
      if (m[key].length > FIELD_LIMITS[key]) {
        throw new BadRequestException(`Row ${i + 1}: ${key} can be up to ${FIELD_LIMITS[key]} characters`);
      }
    }
    out.push(m);
  });
  return out;
}

/** Trims, drops empty and repeated tests (case-insensitive) */
export function normalizeLabTests(tests: string[] = []) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tests) {
    const v = text(t);
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}

@Injectable()
export class ConsultationPrescriptionsService {
  private readonly logger = new Logger(ConsultationPrescriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async appointmentFor(doctorId: string, appointmentId: string) {
    const a = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, doctorId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!a) throw new NotFoundException('Appointment not found');
    return a;
  }

  private patientOf(a: AppointmentWithDetails) {
    const account = [a.user.firstName, a.user.lastName].filter(Boolean).join(' ').trim() || a.user.phone || 'Patient';
    if (a.patientType === 'FAMILY_MEMBER' && a.familyMember) {
      const age = a.familyMember.age ?? ageFrom(a.familyMember.dateOfBirth);
      return {
        name: a.familyMember.fullName,
        age: age != null ? `${age} yrs` : null,
        gender: a.familyMember.gender || null,
        phone: a.user.phone,
        bookedBy: account,
      };
    }
    return { name: account, age: null, gender: null, phone: a.user.phone, bookedBy: null };
  }

  private doctorOf(a: AppointmentWithDetails) {
    return {
      name: doctorName(a.doctor.fullName),
      title: a.doctor.title,
      degrees: a.doctor.degrees,
      pmdcNumber: a.doctor.pmdcNumber,
      phone: a.doctor.phone,
      email: a.doctor.email,
      specialisation: a.doctor.specialisations[0] ?? null,
    };
  }

  private prescriptionOut(p: PrescriptionRow | null) {
    if (!p) return null;
    return {
      id: p.id,
      appointmentId: p.appointmentId,
      diagnosis: p.diagnosis,
      medicines: (Array.isArray(p.medicines) ? p.medicines : []) as unknown as PrescriptionMedicine[],
      labTests: p.labTests,
      advice: p.advice,
      pdfUrl: p.pdfUrl,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  /** GET /doctors/me/prescriptions/draft?appointmentId=: everything the form auto-fills */
  async draft(doctorId: string, appointmentId: string) {
    const a = await this.appointmentFor(doctorId, appointmentId);
    return {
      appointment: {
        id: a.id,
        appointmentNum: a.appointmentNum,
        status: a.status,
        serviceMode: a.serviceMode,
        appointmentDate: a.appointmentDate,
        startTime: a.startTime,
        endTime: a.endTime,
        symptoms: a.intake?.symptoms ?? [],
      },
      canPrescribe: PRESCRIBABLE.includes(a.status),
      patient: this.patientOf(a),
      doctor: this.doctorOf(a),
      prescription: this.prescriptionOut(a.consultationPrescription),
    };
  }

  /** POST /doctors/me/prescriptions: saves, generates the PDF and tells the patient */
  async save(doctorId: string, dto: SaveConsultationPrescriptionDto, now = new Date()) {
    const a = await this.appointmentFor(doctorId, dto.appointmentId);
    if (!PRESCRIBABLE.includes(a.status)) {
      throw new BadRequestException(
        `This appointment is ${a.status.toLowerCase().replace('_', ' ')}. Prescriptions can be written for confirmed or completed consultations only.`,
      );
    }
    const medicines = normalizeMedicines(dto.medicines ?? []);
    const labTests = normalizeLabTests(dto.labTests);
    const diagnosis = dto.diagnosis?.trim() || null;
    const advice = dto.advice?.trim() || null;
    if (!diagnosis && medicines.length === 0 && labTests.length === 0 && !advice) {
      throw new BadRequestException('Add a diagnosis, at least one medicine, a lab test or advice before saving.');
    }

    const patient = this.patientOf(a);
    const doctor = this.doctorOf(a);
    const pdf = buildPrescriptionPdf({
      doctor,
      patient: {
        name: patient.name,
        age: dto.patientAge || patient.age,
        gender: dto.patientGender || patient.gender,
      },
      date: a.appointmentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
      appointmentNum: a.appointmentNum,
      consultationType: MODE_LABEL[a.serviceMode] ?? a.serviceMode,
      diagnosis,
      medicines,
      labTests,
      advice,
      issuedAt: `${now.toLocaleDateString('en-GB', { timeZone: APP_TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', {
        timeZone: APP_TIMEZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}`,
    });

    const dir = join(process.cwd(), 'uploads', PRESCRIPTION_PDF_DIR);
    await mkdir(dir, { recursive: true });
    const fileName = `${a.appointmentNum.replace(/[^A-Za-z0-9-]/g, '')}-${Date.now()}-${randomBytes(6).toString('hex')}.pdf`;
    await writeFile(join(dir, fileName), pdf);
    const pdfUrl = `${PRESCRIPTION_PDF_PREFIX}${fileName}`;

    // Read before saving: the row is about to change
    const hadPrescription = !!a.consultationPrescription;
    const previousPdf = a.consultationPrescription?.pdfUrl ?? null;
    const data = {
      diagnosis,
      medicines: medicines as unknown as Prisma.InputJsonValue,
      labTests,
      advice,
      pdfUrl,
    };
    const [saved] = await this.prisma.$transaction([
      this.prisma.consultationPrescription.upsert({
        where: { appointmentId: a.id },
        create: { appointmentId: a.id, doctorId: a.doctorId, userId: a.userId, ...data },
        update: data,
      }),
      this.prisma.appointment.update({ where: { id: a.id }, data: { prescriptionUrl: pdfUrl } }),
    ]);

    // The old PDF is replaced by the new one
    if (previousPdf?.startsWith(PRESCRIPTION_PDF_PREFIX) && previousPdf !== pdfUrl) {
      const old = previousPdf.slice(PRESCRIPTION_PDF_PREFIX.length);
      if (/^[A-Za-z0-9.-]+$/.test(old)) {
        await unlink(join(dir, old)).catch((e: unknown) => this.logger.warn(`Could not remove old prescription PDF: ${(e as Error).message}`));
      }
    }

    await recordPatientNotification(this.prisma, {
      userId: a.userId,
      type: PRESCRIPTION_NOTIFICATION_TYPE,
      title: hadPrescription ? 'Prescription Updated' : 'Prescription Ready',
      message: hadPrescription
        ? `${doctor.name} updated your consultation prescription (${a.appointmentNum}).`
        : `${doctor.name} uploaded your consultation prescription.`,
    });

    return { created: !hadPrescription, prescription: this.prescriptionOut(saved), pdfUrl };
  }

  /** GET /doctors/me/prescriptions: the doctor's prescriptions, newest first */
  async list(doctorId: string) {
    const rows = await this.prisma.consultationPrescription.findMany({
      where: { doctorId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        appointment: {
          select: {
            id: true,
            appointmentNum: true,
            serviceMode: true,
            appointmentDate: true,
            startTime: true,
            status: true,
            patientType: true,
            user: { select: { firstName: true, lastName: true, phone: true } },
            familyMember: { select: { fullName: true } },
          },
        },
      },
    });
    return rows.map((r) => {
      const a = r.appointment;
      const account = [a.user.firstName, a.user.lastName].filter(Boolean).join(' ').trim() || a.user.phone || 'Patient';
      return {
        id: r.id,
        appointmentId: a.id,
        appointmentNum: a.appointmentNum,
        serviceMode: a.serviceMode,
        appointmentDate: a.appointmentDate,
        startTime: a.startTime,
        appointmentStatus: a.status,
        patientName: a.patientType === 'FAMILY_MEMBER' && a.familyMember ? a.familyMember.fullName : account,
        diagnosis: r.diagnosis,
        medicineCount: Array.isArray(r.medicines) ? r.medicines.length : 0,
        labTests: r.labTests,
        pdfUrl: r.pdfUrl,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
  }
}

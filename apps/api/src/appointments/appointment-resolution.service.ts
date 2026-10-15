// Admin-assisted follow-up after a doctor reschedules or declines a booking.
//
//   Doctor reschedules -> admin "Notify Patient of Proposed Slot" -> patient:
//       approve        -> CONFIRMED, doctor told
//       pick a time    -> booking moves to that time, doctor clicks "Accept Slot"
//       other doctor   -> CANCELLED, admin recommends a doctor -> patient books them
//   Doctor declines   -> admin "Find Alternative Doctor" -> patient books them
//
// No new columns: each step is recorded as an admin Notification that mentions
// the appointment number (APT-...), so the current step of every case can be
// read back from those rows, plus the DoctorNotification for "Accept Slot".

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentStatus, ConsultationServiceMode, DoctorStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  APPOINTMENT_NUMBER_REGEX,
  appointmentWhen,
  DOCTOR_ACTION_NOTIFICATION_TYPES,
  DOCTOR_NOTIFICATION_TYPES,
  DOCTOR_PORTAL_NOTIFICATION_TYPES,
  doctorName,
  PATIENT_NOTIFICATION_TYPES,
  PMDC_REFERENCE_REGEX,
  recordDoctorNotification,
  recordDoctorPortalNotification,
  recordPatientNotification,
} from '../doctor-admin/doctor-portal-notifications.js';
import { AppointmentsService } from './appointments.service.js';
import type { PatientRescheduleResponseDto } from './dto/resolution.dto.js';

const T = DOCTOR_PORTAL_NOTIFICATION_TYPES;

/** Admin notification types that make up a case's history */
const TRAIL_TYPES: string[] = [
  T.APPOINTMENT_RESCHEDULED,
  T.APPOINTMENT_DECLINED,
  T.APPOINTMENT_RESCHEDULE_FORWARDED,
  T.APPOINTMENT_PATIENT_RESPONSE,
  T.APPOINTMENT_ALTERNATIVE_REQUESTED,
  T.APPOINTMENT_ALTERNATIVE_RECOMMENDED,
];

/** Alternative doctors' fee must be within this share of the original fee to count as "matching" */
export const FEE_RANGE = 0.5;

/** How far back the patient's pending actions are looked up */
const PENDING_WINDOW_DAYS = 90;

/**
 * Where a case stands:
 * - AWAITING_FORWARD: doctor proposed a new time, admin hasn't sent it to the patient yet
 * - RESCHEDULE_PROPOSED: patient must approve or decline the doctor's new time
 * - AWAITING_DOCTOR: patient picked another time, the doctor must accept it
 * - AWAITING_RECOMMENDATION: booking cancelled, admin should recommend another doctor
 * - ALTERNATIVE_RECOMMENDED: patient can book the recommended doctor
 */
export type ResolutionStage =
  | 'AWAITING_FORWARD'
  | 'RESCHEDULE_PROPOSED'
  | 'AWAITING_DOCTOR'
  | 'AWAITING_RECOMMENDATION'
  | 'ALTERNATIVE_RECOMMENDED'
  | null;

export interface ResolutionState {
  stage: ResolutionStage;
  forwardedAt: Date | null;
  /** patient asked for a different doctor */
  alternativeRequestedAt: Date | null;
  recommendedAt: Date | null;
  recommendedPmdc: string | null;
}

type TrailRow = { type: string; message: string; createdAt: Date };

const DOCTOR_CARD_SELECT = {
  id: true,
  fullName: true,
  title: true,
  pmdcNumber: true,
  specialisations: true,
  experienceYears: true,
  profilePhotoUrl: true,
  isVideoCallEnabled: true,
  videoCallFee: true,
  isTextConsultEnabled: true,
  textConsultFee: true,
  clinics: { select: { id: true, name: true, address: true, inPersonFee: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.DoctorSelect;

type DoctorCard = Prisma.DoctorGetPayload<{ select: typeof DOCTOR_CARD_SELECT }>;

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;

const fullName = (u: { firstName: string | null; lastName: string | null } | null | undefined) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();

function patientLabel(a: {
  patientType: string;
  familyMember: { fullName: string } | null;
  user: { firstName: string | null; lastName: string | null; phone: string | null } | null;
}) {
  if (a.patientType === 'FAMILY_MEMBER' && a.familyMember) return a.familyMember.fullName;
  return fullName(a.user) || a.user?.phone || 'Patient';
}

/** Fees a doctor charges for one consultation type (one per clinic for in-clinic visits). */
function feesFor(doctor: DoctorCard, mode: ConsultationServiceMode) {
  if (mode === ConsultationServiceMode.IN_CLINIC) {
    return doctor.clinics.map((c) => ({ clinicId: c.id as string | null, clinicName: c.name as string | null, fee: c.inPersonFee }));
  }
  const fee =
    mode === ConsultationServiceMode.VIDEO
      ? doctor.isVideoCallEnabled ? doctor.videoCallFee : null
      : doctor.isTextConsultEnabled ? doctor.textConsultFee : null;
  return fee == null ? [] : [{ clinicId: null, clinicName: null, fee }];
}

const MODE_LABEL: Record<string, string> = {
  IN_CLINIC: 'in-clinic visit',
  VIDEO: 'video call',
  TEXT: 'text consultation',
};

function matchesSpeciality(doctorSpecs: string[], targets: string[]) {
  const t = targets.map((x) => x.toLowerCase().trim()).filter(Boolean);
  return doctorSpecs.some((s) => {
    const v = s.toLowerCase().trim();
    return t.some((x) => v.includes(x) || x.includes(v));
  });
}

const RESOLUTION_APPOINTMENT_SELECT = {
  id: true,
  appointmentNum: true,
  userId: true,
  doctorId: true,
  clinicId: true,
  intakeId: true,
  status: true,
  serviceMode: true,
  appointmentDate: true,
  startTime: true,
  endTime: true,
  fee: true,
  cancelReason: true,
  patientType: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { firstName: true, lastName: true, phone: true } },
  familyMember: { select: { fullName: true } },
  doctor: { select: { id: true, fullName: true, specialisations: true } },
  clinic: { select: { id: true, name: true } },
  intake: { select: { speciality: { select: { name: true } } } },
} satisfies Prisma.AppointmentSelect;

type ResolutionAppointment = Prisma.AppointmentGetPayload<{ select: typeof RESOLUTION_APPOINTMENT_SELECT }>;

@Injectable()
export class AppointmentResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Where each case stands (shared by the admin, patient and doctor views)
  // ---------------------------------------------------------------------------

  /** Case state for each appointment, read from its notification history. */
  async states(
    appointments: { id: string; appointmentNum: string; status: string }[],
  ): Promise<Map<string, ResolutionState>> {
    const result = new Map<string, ResolutionState>();
    if (appointments.length === 0) return result;

    const nums = appointments.map((a) => a.appointmentNum);
    const [trail, pendingSlots] = await Promise.all([
      this.prisma.notification.findMany({
        where: { type: { in: TRAIL_TYPES }, OR: nums.map((n) => ({ message: { contains: n } })) },
        select: { type: true, message: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.doctorNotification.findMany({
        where: {
          appointmentId: { in: appointments.map((a) => a.id) },
          type: DOCTOR_NOTIFICATION_TYPES.NEW_SLOT_REQUESTED,
          isRead: false,
        },
        select: { appointmentId: true },
      }),
    ]);

    const byNum = new Map<string, TrailRow[]>();
    for (const row of trail) {
      const num = row.message.match(APPOINTMENT_NUMBER_REGEX)?.[0];
      if (!num) continue;
      const list = byNum.get(num) ?? [];
      list.push(row);
      byNum.set(num, list);
    }
    const waitingForDoctor = new Set(pendingSlots.map((p) => p.appointmentId));

    for (const a of appointments) {
      const rows = byNum.get(a.appointmentNum) ?? [];
      const last = (type: string) => [...rows].reverse().find((r) => r.type === type) ?? null;
      const rescheduled = last(T.APPOINTMENT_RESCHEDULED);
      const forwarded = last(T.APPOINTMENT_RESCHEDULE_FORWARDED);
      const requested = last(T.APPOINTMENT_ALTERNATIVE_REQUESTED);
      const recommended = last(T.APPOINTMENT_ALTERNATIVE_RECOMMENDED);
      const forwardedCurrent =
        forwarded && (!rescheduled || forwarded.createdAt >= rescheduled.createdAt) ? forwarded : null;

      let stage: ResolutionStage = null;
      if (a.status === AppointmentStatus.RESCHEDULED) {
        if (waitingForDoctor.has(a.id)) stage = 'AWAITING_DOCTOR';
        else if (forwardedCurrent) stage = 'RESCHEDULE_PROPOSED';
        else if (rescheduled) stage = 'AWAITING_FORWARD';
      } else if (a.status === AppointmentStatus.CANCELLED) {
        if (recommended && (!requested || recommended.createdAt >= requested.createdAt)) stage = 'ALTERNATIVE_RECOMMENDED';
        else if (requested || last(T.APPOINTMENT_DECLINED)) stage = 'AWAITING_RECOMMENDATION';
      }

      result.set(a.id, {
        stage,
        forwardedAt: forwardedCurrent?.createdAt ?? null,
        alternativeRequestedAt: requested?.createdAt ?? null,
        recommendedAt: recommended?.createdAt ?? null,
        recommendedPmdc: recommended?.message.match(PMDC_REFERENCE_REGEX)?.[1] ?? null,
      });
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Admin -> patient: send the doctor's proposed time
  // ---------------------------------------------------------------------------

  async forwardReschedule(appointmentId: string, note?: string) {
    const a = await this.load(appointmentId);
    if (a.status !== AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('Only an appointment the doctor has rescheduled can be sent to the patient');
    }
    const state = (await this.states([a])).get(a.id)!;
    if (state.stage === 'AWAITING_DOCTOR') {
      throw new BadRequestException('The patient has already picked another time. Waiting for the doctor to accept it.');
    }

    const dr = doctorName(a.doctor.fullName);
    const when = appointmentWhen(a.appointmentDate, a.startTime);
    const reason = a.cancelReason?.trim().replace(/[.\s]+$/, '');

    await recordPatientNotification(this.prisma, {
      userId: a.userId,
      type: PATIENT_NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULE_PROPOSED,
      title: 'New Time Proposed for Your Appointment',
      message:
        `${dr} has proposed a new time for your appointment ${a.appointmentNum}: ${when}.` +
        (reason ? ` Reason: ${reason}.` : '') +
        (note ? ` Message from Tabibistan: ${note}` : '') +
        ' Please approve the new time, pick another time, or ask for a different doctor.',
    });
    await this.closeCase(a.appointmentNum);
    await recordDoctorPortalNotification(this.prisma, {
      type: T.APPOINTMENT_RESCHEDULE_FORWARDED,
      title: 'Proposed time sent to patient',
      message: `${dr}'s proposed time for ${a.appointmentNum} (${when}) was sent to patient ${patientLabel(a)}. Waiting for the patient's reply.`,
      isRead: true,
    });
    return this.adminSummary(a.id);
  }

  // ---------------------------------------------------------------------------
  // Patient's reply to the proposed time
  // ---------------------------------------------------------------------------

  async patientResponse(userId: string, appointmentId: string, dto: PatientRescheduleResponseDto) {
    const a = await this.load(appointmentId, userId);
    const state = (await this.states([a])).get(a.id)!;
    if (state.stage !== 'RESCHEDULE_PROPOSED') {
      throw new BadRequestException(
        state.stage === 'AWAITING_DOCTOR'
          ? 'You have already picked another time. The doctor will confirm it shortly.'
          : 'This appointment is not waiting for your reply.',
      );
    }

    const dr = doctorName(a.doctor.fullName);
    const patient = patientLabel(a);
    const note = dto.note?.trim();

    if (dto.action === 'ACCEPT') {
      const { count } = await this.prisma.appointment.updateMany({
        where: { id: a.id, status: AppointmentStatus.RESCHEDULED },
        data: { status: AppointmentStatus.CONFIRMED, cancelReason: null },
      });
      if (count === 0) throw new BadRequestException('This appointment has already been updated');
      const when = appointmentWhen(a.appointmentDate, a.startTime);

      await recordDoctorNotification(this.prisma, {
        doctorId: a.doctorId,
        appointmentId: a.id,
        type: DOCTOR_NOTIFICATION_TYPES.RESCHEDULE_APPROVED,
        title: 'Reschedule Accepted',
        message: `Patient accepted your rescheduled time slot for ${a.appointmentNum} (${when}).`,
      });
      await this.closeCase(a.appointmentNum);
      await recordDoctorPortalNotification(this.prisma, {
        type: T.APPOINTMENT_PATIENT_RESPONSE,
        title: 'Patient approved the new time',
        message: `Patient ${patient} approved ${dr}'s new time for ${a.appointmentNum} (${when}). The appointment is confirmed.`,
        isRead: true,
      });
      return { stage: null, status: AppointmentStatus.CONFIRMED, message: `Your appointment with ${dr} on ${when} is confirmed.` };
    }

    if (dto.action === 'PROPOSE_SLOT') {
      const moved = await this.appointments.moveForPatient(
        userId,
        a.id,
        dto.date!,
        dto.startTime!,
        `The patient asked for this time instead.${note ? ` Note: ${note}` : ''}`,
      );
      const when = appointmentWhen(moved.appointmentDate, moved.startTime);
      const dayOnly = when.replace(' at ', ', ');

      await recordDoctorNotification(this.prisma, {
        doctorId: a.doctorId,
        appointmentId: a.id,
        type: DOCTOR_NOTIFICATION_TYPES.NEW_SLOT_REQUESTED,
        title: 'New Time Requested',
        message: `Patient requested slot (${dayOnly}) for ${a.appointmentNum}. Click to Accept.${note ? ` Note: ${note}` : ''}`,
      });
      await this.closeCase(a.appointmentNum);
      await recordDoctorPortalNotification(this.prisma, {
        type: T.APPOINTMENT_PATIENT_RESPONSE,
        title: 'Patient picked another time',
        message: `Patient ${patient} declined ${dr}'s proposed time for ${a.appointmentNum} and picked ${when} instead. Waiting for ${dr} to accept it.`,
        isRead: true,
      });
      return {
        stage: 'AWAITING_DOCTOR' as const,
        status: AppointmentStatus.RESCHEDULED,
        message: `Your request for ${when} was sent to ${dr}. You will be notified once it is confirmed.`,
      };
    }

    // REQUEST_NEW_DOCTOR
    const { count } = await this.prisma.appointment.updateMany({
      where: { id: a.id, status: AppointmentStatus.RESCHEDULED },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelReason: `The patient declined the proposed time and asked for a different doctor.${note ? ` Note: ${note}` : ''}`,
      },
    });
    if (count === 0) throw new BadRequestException('This appointment has already been updated');

    await recordDoctorNotification(this.prisma, {
      doctorId: a.doctorId,
      appointmentId: a.id,
      type: DOCTOR_NOTIFICATION_TYPES.RESCHEDULE_DECLINED,
      title: 'Reschedule Declined',
      message: `Patient declined your proposed time for ${a.appointmentNum} and chose to see another doctor. The appointment has been cancelled.`,
    });
    await this.closeCase(a.appointmentNum);
    await recordDoctorPortalNotification(this.prisma, {
      type: T.APPOINTMENT_ALTERNATIVE_REQUESTED,
      title: 'Patient Requested a Different Doctor',
      message:
        `Patient declined reschedule for ${a.appointmentNum} and requested an alternative doctor. ` +
        `Original doctor: ${dr}. Patient: ${patient}.` +
        (note ? ` Reason: ${note}` : ''),
    });
    return {
      stage: 'AWAITING_RECOMMENDATION' as const,
      status: AppointmentStatus.CANCELLED,
      message: 'Thank you. Our team will recommend another doctor for you shortly.',
    };
  }

  // ---------------------------------------------------------------------------
  // Admin: matching doctors and recommendation
  // ---------------------------------------------------------------------------

  /** Approved doctors offering the same consultation type, flagged by speciality and fee match. */
  async alternativeDoctors(appointmentId: string) {
    const a = await this.load(appointmentId);
    const targets = a.intake?.speciality?.name ? [a.intake.speciality.name] : a.doctor.specialisations;
    const min = Math.round(a.fee * (1 - FEE_RANGE));
    const max = Math.round(a.fee * (1 + FEE_RANGE));

    const doctors = await this.prisma.doctor.findMany({
      where: { status: DoctorStatus.APPROVED, isActive: true, id: { not: a.doctorId } },
      select: DOCTOR_CARD_SELECT,
      orderBy: { fullName: 'asc' },
      take: 300,
    });

    const rows = doctors
      .map((d) => {
        const fees = feesFor(d, a.serviceMode);
        if (fees.length === 0) return null; // doesn't offer this consultation type
        const lowest = Math.min(...fees.map((f) => f.fee));
        return {
          doctorId: d.id,
          fullName: d.fullName,
          title: d.title,
          pmdcNumber: d.pmdcNumber,
          specialisations: d.specialisations,
          experienceYears: d.experienceYears,
          profilePhotoUrl: d.profilePhotoUrl,
          fees,
          fee: lowest,
          matchesSpeciality: matchesSpeciality(d.specialisations, targets),
          withinFeeRange: fees.some((f) => f.fee >= min && f.fee <= max),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort(
        (x, y) =>
          Number(y.matchesSpeciality && y.withinFeeRange) - Number(x.matchesSpeciality && x.withinFeeRange) ||
          Number(y.matchesSpeciality) - Number(x.matchesSpeciality) ||
          Number(y.withinFeeRange) - Number(x.withinFeeRange) ||
          Math.abs(x.fee - a.fee) - Math.abs(y.fee - a.fee) ||
          x.fullName.localeCompare(y.fullName),
      );

    return {
      appointment: await this.adminSummary(a.id),
      speciality: targets,
      serviceMode: a.serviceMode,
      originalFee: a.fee,
      feeRange: { min, max },
      doctors: rows,
    };
  }

  async recommendAlternative(appointmentId: string, doctorId: string, note?: string) {
    const a = await this.load(appointmentId);
    if (a.status !== AppointmentStatus.CANCELLED) {
      throw new BadRequestException('A doctor can be recommended once the original appointment is cancelled');
    }
    if (doctorId === a.doctorId) throw new BadRequestException('Please choose a different doctor');

    const d = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { ...DOCTOR_CARD_SELECT, status: true, isActive: true },
    });
    if (!d || d.status !== DoctorStatus.APPROVED || !d.isActive) {
      throw new BadRequestException('This doctor is not accepting appointments right now');
    }
    const fees = feesFor(d, a.serviceMode);
    if (fees.length === 0) {
      throw new BadRequestException(`This doctor does not offer a ${MODE_LABEL[a.serviceMode] ?? 'consultation'}`);
    }
    const fee = Math.min(...fees.map((f) => f.fee));
    const feeText = fees.length > 1 ? `from ${pkr(fee)}` : pkr(fee);
    const speciality = d.specialisations[0] ?? d.title;
    const from = doctorName(a.doctor.fullName);
    const to = doctorName(d.fullName);

    await recordPatientNotification(this.prisma, {
      userId: a.userId,
      type: PATIENT_NOTIFICATION_TYPES.APPOINTMENT_ALTERNATIVE_DOCTOR,
      title: 'Recommended Doctor for Your Consultation',
      message:
        `${from} is unavailable for your appointment ${a.appointmentNum}. We recommend ${to} (${speciality}, ${feeText}).` +
        (note ? ` Message from Tabibistan: ${note}` : ''),
    });
    await this.closeCase(a.appointmentNum);
    await recordDoctorPortalNotification(this.prisma, {
      type: T.APPOINTMENT_ALTERNATIVE_RECOMMENDED,
      title: 'Alternative doctor recommended',
      message: `Recommended ${to} (PMDC ${d.pmdcNumber}) to patient ${patientLabel(a)} for ${a.appointmentNum}, instead of ${from}. Fee: ${feeText}.`,
      isRead: true,
    });
    return this.adminSummary(a.id);
  }

  // ---------------------------------------------------------------------------
  // Patient: appointments that need the patient's reply (for the notifications page)
  // ---------------------------------------------------------------------------

  async pendingForPatient(userId: string) {
    const since = new Date(Date.now() - PENDING_WINDOW_DAYS * 86_400_000);
    const list = await this.prisma.appointment.findMany({
      where: {
        userId,
        status: { in: [AppointmentStatus.RESCHEDULED, AppointmentStatus.CANCELLED] },
        updatedAt: { gte: since },
      },
      select: RESOLUTION_APPOINTMENT_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    const states = await this.states(list);

    const pmdcs = [...new Set([...states.values()].map((s) => s.recommendedPmdc).filter(Boolean))] as string[];
    const recommendedDoctors = pmdcs.length
      ? await this.prisma.doctor.findMany({
          where: { pmdcNumber: { in: pmdcs } },
          select: { ...DOCTOR_CARD_SELECT, status: true, isActive: true },
        })
      : [];
    const byPmdc = new Map(recommendedDoctors.map((d) => [d.pmdcNumber, d]));

    const items = [];
    for (const a of list) {
      const s = states.get(a.id)!;
      // AWAITING_FORWARD is the admin's step; the patient hasn't been asked anything yet.
      // A doctor's decline is handled by the admin first, so it only shows once the patient asked for another doctor.
      if (!s.stage || s.stage === 'AWAITING_FORWARD') continue;
      if (s.stage === 'AWAITING_RECOMMENDATION' && !s.alternativeRequestedAt) continue;

      let recommendation = null;
      if (s.stage === 'ALTERNATIVE_RECOMMENDED' && s.recommendedPmdc) {
        const d = byPmdc.get(s.recommendedPmdc);
        if (d) {
          const fees = feesFor(d, a.serviceMode);
          const booked = await this.prisma.appointment.findFirst({
            where: { userId, doctorId: d.id, createdAt: { gte: s.recommendedAt ?? a.updatedAt } },
            select: { id: true, appointmentNum: true },
            orderBy: { createdAt: 'desc' },
          });
          recommendation = {
            doctor: {
              id: d.id,
              fullName: d.fullName,
              title: d.title,
              specialisations: d.specialisations,
              experienceYears: d.experienceYears,
              profilePhotoUrl: d.profilePhotoUrl,
            },
            fee: fees.length ? Math.min(...fees.map((f) => f.fee)) : null,
            feeVaries: fees.length > 1,
            available: d.status === DoctorStatus.APPROVED && d.isActive && fees.length > 0,
            serviceMode: a.serviceMode,
            /** pre-fills the booking page */
            booking: { doctorId: d.id, mode: a.serviceMode, intakeId: a.intakeId },
            bookedAppointment: booked,
          };
        }
      }

      items.push({
        appointmentId: a.id,
        appointmentNum: a.appointmentNum,
        stage: s.stage,
        status: a.status,
        serviceMode: a.serviceMode,
        clinicId: a.clinicId,
        clinicName: a.clinic?.name ?? null,
        doctor: { id: a.doctor.id, fullName: a.doctor.fullName },
        appointmentDate: a.appointmentDate,
        startTime: a.startTime,
        endTime: a.endTime,
        fee: a.fee,
        reason: a.cancelReason,
        patientName: patientLabel(a),
        recommendation,
      });
    }
    return items;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Current step of one case, for the admin screens. */
  async adminSummary(appointmentId: string) {
    const a = await this.load(appointmentId);
    const s = (await this.states([a])).get(a.id)!;
    const recommended = s.recommendedPmdc
      ? await this.prisma.doctor.findUnique({ where: { pmdcNumber: s.recommendedPmdc }, select: { id: true, fullName: true } })
      : null;
    return {
      id: a.id,
      appointmentNum: a.appointmentNum,
      status: a.status,
      serviceMode: a.serviceMode,
      appointmentDate: a.appointmentDate,
      startTime: a.startTime,
      fee: a.fee,
      reason: a.cancelReason,
      doctorName: doctorName(a.doctor.fullName),
      patientName: patientLabel(a),
      stage: s.stage,
      forwardedAt: s.forwardedAt,
      alternativeRequestedAt: s.alternativeRequestedAt,
      recommendedAt: s.recommendedAt,
      recommendedDoctor: recommended ? { id: recommended.id, name: doctorName(recommended.fullName) } : null,
    };
  }

  private async load(appointmentId: string, userId?: string): Promise<ResolutionAppointment> {
    const a = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, ...(userId ? { userId } : {}) },
      select: RESOLUTION_APPOINTMENT_SELECT,
    });
    if (!a) throw new NotFoundException('Appointment not found');
    return a;
  }

  /** The admin has acted: unread follow-up notifications for this appointment are marked read. */
  private async closeCase(appointmentNum: string) {
    await this.prisma.notification.updateMany({
      where: { type: { in: DOCTOR_ACTION_NOTIFICATION_TYPES }, isRead: false, message: { contains: appointmentNum } },
      data: { isRead: true },
    });
  }
}

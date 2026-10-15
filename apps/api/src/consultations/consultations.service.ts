import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentStatus, ConsultationServiceMode, DoctorStatus, IntakeStatus, SenderType } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { verifyDoctorToken } from '../doctors/doctor-auth.js';
import { daysBetween, nowInAppZone, toMinutes } from '../appointments/slot-utils.js';
import {
  appointmentWhen,
  DOCTOR_PORTAL_NOTIFICATION_TYPES,
  doctorName,
  recordDoctorPortalNotification,
} from '../doctor-admin/doctor-portal-notifications.js';
import { signRoomTicket, type ParticipantRole, type RoomTicket } from './room-ticket.js';

/** The room opens this many minutes before the start time... */
export const ROOM_OPENS_BEFORE_MINUTES = 10;
/** ...and closes this many minutes after the end time. */
export const ROOM_CLOSES_AFTER_MINUTES = 30;

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
/** Files shared in a consultation are uploaded here (see the controller). */
export const CHAT_UPLOAD_PREFIX = '/uploads/consultation-chat/';

/** Who is asking: the doctor's login token, or the patient's user id (same convention as the rest of the patient API). */
export interface Requester {
  doctorToken?: string | null;
  userId?: string | null;
  /** "doctor" when the doctor portal opened the room (a browser can hold both logins) */
  as?: string | null;
}

export type AccessReason =
  | 'NOT_APPROVED'
  | 'RESCHEDULE_PENDING'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'IN_CLINIC'
  | 'TOO_EARLY'
  | 'EXPIRED';

const APPOINTMENT_SELECT = {
  id: true,
  appointmentNum: true,
  userId: true,
  doctorId: true,
  intakeId: true,
  status: true,
  serviceMode: true,
  appointmentDate: true,
  startTime: true,
  endTime: true,
  patientType: true,
  doctorNotes: true,
  updatedAt: true,
  doctor: { select: { id: true, fullName: true, title: true, specialisations: true, profilePhotoUrl: true } },
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
  familyMember: { select: { fullName: true, relation: true } },
  clinic: { select: { name: true, address: true } },
  intake: { select: { symptoms: true, speciality: { select: { name: true } } } },
} satisfies Prisma.AppointmentSelect;

type RoomAppointment = Prisma.AppointmentGetPayload<{ select: typeof APPOINTMENT_SELECT }>;

const MESSAGE_SELECT = {
  id: true,
  appointmentId: true,
  senderId: true,
  senderType: true,
  message: true,
  attachments: true,
  isRead: true,
  createdAt: true,
} satisfies Prisma.ConsultationMessageSelect;

export type ChatMessage = Prisma.ConsultationMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

const accountName = (u: { firstName: string | null; lastName: string | null; phone: string | null } | null) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.phone || 'Patient';

function patientName(a: RoomAppointment) {
  if (a.patientType === 'FAMILY_MEMBER' && a.familyMember) return a.familyMember.fullName;
  return accountName(a.user);
}

/** STUN for everyone; TURN (a relay for strict networks) when configured in the API's .env. */
export function iceServers() {
  const servers: { urls: string[]; username?: string; credential?: string }[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const turn = (process.env.TURN_URLS ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  if (turn.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    servers.push({ urls: turn, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  return servers;
}

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly doctors: DoctorsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Who is asking
  // ---------------------------------------------------------------------------

  /** Loads the appointment and checks the requester is its patient or its doctor (403 otherwise). */
  async participant(appointmentId: string, req: Requester) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId }, select: APPOINTMENT_SELECT });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const wantsDoctor = req.as === 'doctor' || (!!req.doctorToken && !req.userId);
    if (wantsDoctor) {
      const auth = verifyDoctorToken(req.doctorToken);
      if (!auth) throw new UnauthorizedException('Your doctor session has expired. Please sign in again.');
      const doctor = await this.doctors.resolveDoctorForAuth(auth);
      if (doctor.id !== appointment.doctorId) {
        throw new ForbiddenException('This consultation belongs to another doctor.');
      }
      if (doctor.status !== DoctorStatus.APPROVED) {
        throw new ForbiddenException('Your account is still being verified. Consultations open once it is approved.');
      }
      return { appointment, role: 'DOCTOR' as ParticipantRole, pid: doctor.id, name: doctorName(appointment.doctor.fullName) };
    }

    if (!req.userId) throw new UnauthorizedException('Please log in to join your consultation.');
    if (req.userId !== appointment.userId) {
      throw new ForbiddenException('You are not a participant of this consultation.');
    }
    return { appointment, role: 'USER' as ParticipantRole, pid: appointment.userId, name: patientName(appointment) };
  }

  // ---------------------------------------------------------------------------
  // GET /consultations/:id/access-check
  // ---------------------------------------------------------------------------

  async accessCheck(appointmentId: string, req: Requester, now = new Date()) {
    const { appointment: a, role, pid, name } = await this.participant(appointmentId, req);
    const window = this.timeWindow(a, now);
    const when = appointmentWhen(a.appointmentDate, a.startTime);
    const base = {
      appointment: this.brief(a),
      role,
      me: { role, name },
      other:
        role === 'DOCTOR'
          ? { role: 'USER' as const, name: patientName(a) }
          : { role: 'DOCTOR' as const, name: doctorName(a.doctor.fullName) },
      scheduledTime: when,
      opensAt: window.opensAt.toISOString(),
      closesAt: window.closesAt.toISOString(),
    };
    const locked = (reason: AccessReason, message: string, extra: Record<string, unknown> = {}) => ({
      canJoin: false as const,
      reason,
      message,
      ...base,
      ...extra,
    });

    if (a.serviceMode === ConsultationServiceMode.IN_CLINIC) {
      return locked(
        'IN_CLINIC',
        `This is an in-clinic visit, so there is no online room. Please visit ${a.clinic?.name ?? 'the clinic'} on ${when}.`,
      );
    }
    switch (a.status) {
      case AppointmentStatus.PENDING:
        return locked('NOT_APPROVED', 'Appointment is waiting for doctor approval.');
      case AppointmentStatus.RESCHEDULED:
        return locked('RESCHEDULE_PENDING', 'The time of this appointment is being changed. The room opens once the new time is confirmed.');
      case AppointmentStatus.CANCELLED:
        return locked('CANCELLED', 'This appointment was cancelled.');
      case AppointmentStatus.COMPLETED:
        return locked('COMPLETED', 'This consultation session has ended.');
      case AppointmentStatus.NO_SHOW:
        return locked('NO_SHOW', 'This consultation was marked as missed. Please contact Tabibistan Support if you need help.');
    }

    if (now < window.opensAt) {
      return locked(
        'TOO_EARLY',
        `Your appointment is scheduled at ${when}. Room opens ${ROOM_OPENS_BEFORE_MINUTES} minutes prior.`,
        { secondsUntilOpen: Math.ceil((window.opensAt.getTime() - now.getTime()) / 1000) },
      );
    }
    if (now > window.closesAt) {
      return locked('EXPIRED', 'The time for this consultation has passed. Please contact Tabibistan Support if you missed it.');
    }

    const ticket: RoomTicket = { aid: a.id, role, pid, name, exp: Math.floor(window.closesAt.getTime() / 1000) };
    return {
      canJoin: true as const,
      ...base,
      serviceMode: a.serviceMode as 'VIDEO' | 'TEXT',
      /** signed ticket for the real-time room (chat + video signaling) */
      rtcToken: signRoomTicket(ticket),
      roomChannel: a.id,
      iceServers: iceServers(),
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
    };
  }

  /** Start/end of the booking and when the room opens/closes, as real instants. */
  timeWindow(a: { appointmentDate: Date; startTime: string; endTime: string }, now = new Date()) {
    const zone = nowInAppZone(now);
    const day = a.appointmentDate.toISOString().slice(0, 10);
    const offsetDays = daysBetween(zone.date, day);
    const start = toMinutes(a.startTime) ?? 0;
    const end = toMinutes(a.endTime) ?? start + 30;
    // Minutes from "now" (whole minute) to an appointment clock time
    const nowFloor = now.getTime() - (now.getSeconds() * 1000 + now.getMilliseconds());
    const at = (minutes: number) => new Date(nowFloor + (offsetDays * 1440 + minutes - zone.minutes) * 60_000);
    return {
      startsAt: at(start),
      endsAt: at(end),
      opensAt: at(start - ROOM_OPENS_BEFORE_MINUTES),
      closesAt: at(end + ROOM_CLOSES_AFTER_MINUTES),
    };
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  /** Conversation history; participants can read it any time (also after the session). */
  async messages(appointmentId: string, req: Requester) {
    const { role } = await this.participant(appointmentId, req);
    const messages = await this.prisma.consultationMessage.findMany({
      where: { appointmentId },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });
    return { role, messages };
  }

  /** The room accepts messages and calls only while the appointment is confirmed. */
  async assertRoomOpen(appointmentId: string) {
    const a = await this.prisma.appointment.findUnique({ where: { id: appointmentId }, select: { status: true } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (a.status !== AppointmentStatus.CONFIRMED) {
      throw new ForbiddenException(
        a.status === AppointmentStatus.COMPLETED ? 'This consultation session has ended.' : 'This consultation room is not open.',
      );
    }
  }

  async saveMessage(ticket: RoomTicket, input: { text?: unknown; attachments?: unknown }): Promise<ChatMessage> {
    const text = typeof input.text === 'string' ? input.text.trim() : '';
    const attachments = Array.isArray(input.attachments)
      ? input.attachments.filter((x): x is string => typeof x === 'string')
      : [];
    if (!text && attachments.length === 0) throw new BadRequestException('Type a message or attach a file');
    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`A message can be at most ${MAX_MESSAGE_LENGTH} characters`);
    }
    if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new BadRequestException(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files at a time`);
    }
    // Only files uploaded to this consultation's upload folder
    if (attachments.some((u) => !u.startsWith(CHAT_UPLOAD_PREFIX) || u.includes('..'))) {
      throw new BadRequestException('Attachments must be uploaded first');
    }
    await this.assertRoomOpen(ticket.aid);

    return this.prisma.consultationMessage.create({
      data: {
        appointmentId: ticket.aid,
        senderId: ticket.pid,
        senderType: ticket.role === 'DOCTOR' ? SenderType.DOCTOR : SenderType.USER,
        message: text || null,
        attachments,
      },
      select: MESSAGE_SELECT,
    });
  }

  /** Marks the other side's messages as read; returns the ids that changed. */
  async markRead(ticket: RoomTicket): Promise<string[]> {
    const mine = ticket.role === 'DOCTOR' ? SenderType.DOCTOR : SenderType.USER;
    const unread = await this.prisma.consultationMessage.findMany({
      where: { appointmentId: ticket.aid, isRead: false, senderType: { not: mine } },
      select: { id: true },
    });
    if (unread.length === 0) return [];
    const ids = unread.map((m) => m.id);
    await this.prisma.consultationMessage.updateMany({ where: { id: { in: ids } }, data: { isRead: true } });
    return ids;
  }

  // ---------------------------------------------------------------------------
  // End of the consultation (doctor)
  // ---------------------------------------------------------------------------

  async endConsultation(appointmentId: string, req: Requester, notes?: string) {
    const { appointment: a, role } = await this.participant(appointmentId, req);
    if (role !== 'DOCTOR') throw new ForbiddenException('Only the doctor can end the consultation.');
    if (a.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        a.status === AppointmentStatus.COMPLETED ? 'This consultation has already ended.' : 'This consultation is not active.',
      );
    }
    const clinicalNotes = notes?.trim() || null;

    const { count } = await this.prisma.appointment.updateMany({
      where: { id: a.id, status: AppointmentStatus.CONFIRMED },
      data: { status: AppointmentStatus.COMPLETED, ...(clinicalNotes ? { doctorNotes: clinicalNotes } : {}) },
    });
    if (count === 0) throw new BadRequestException('This consultation has already ended.');
    if (a.intakeId) {
      await this.prisma.consultationIntake
        .update({ where: { id: a.intakeId }, data: { status: IntakeStatus.COMPLETED } })
        .catch((e: unknown) => this.logger.warn(`Could not close intake ${a.intakeId}: ${(e as Error).message}`));
    }
    await this.prisma.consultationMessage
      .create({
        data: {
          appointmentId: a.id,
          senderId: a.doctorId,
          senderType: SenderType.SYSTEM,
          message: `${doctorName(a.doctor.fullName)} ended the consultation.`,
          attachments: [],
          isRead: true,
        },
      })
      .catch(() => undefined);
    await recordDoctorPortalNotification(this.prisma, {
      type: DOCTOR_PORTAL_NOTIFICATION_TYPES.APPOINTMENT_STATUS_UPDATED,
      title: 'Online consultation completed',
      message: `${doctorName(a.doctor.fullName)} completed the ${a.serviceMode === 'VIDEO' ? 'video' : 'text'} consultation ${a.appointmentNum} for patient ${patientName(a)}.`,
    });

    const updated = await this.prisma.appointment.findUniqueOrThrow({ where: { id: a.id }, select: APPOINTMENT_SELECT });
    return { appointment: this.brief(updated) };
  }

  // ---------------------------------------------------------------------------

  private brief(a: RoomAppointment) {
    return {
      id: a.id,
      appointmentNum: a.appointmentNum,
      status: a.status,
      serviceMode: a.serviceMode,
      appointmentDate: a.appointmentDate,
      startTime: a.startTime,
      endTime: a.endTime,
      when: appointmentWhen(a.appointmentDate, a.startTime),
      doctor: {
        id: a.doctor.id,
        name: doctorName(a.doctor.fullName),
        speciality: a.intake?.speciality?.name ?? a.doctor.specialisations[0] ?? a.doctor.title,
        profilePhotoUrl: a.doctor.profilePhotoUrl,
      },
      patientName: patientName(a),
      clinicName: a.clinic?.name ?? null,
      symptoms: a.intake?.symptoms ?? [],
      /** the doctor's notes, shown on the summary once the consultation has ended */
      doctorNotes: a.status === AppointmentStatus.COMPLETED ? a.doctorNotes : null,
    };
  }
}

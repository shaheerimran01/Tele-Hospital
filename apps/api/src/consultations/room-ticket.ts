// Signed "room ticket" for one participant of one consultation.
//
// GET /consultations/:id/access-check issues it only after the role, status
// and time-window checks pass. The real-time gateway (chat + video signaling)
// and the attachment upload accept nothing else, so a socket can't join a room
// it wasn't checked for, and the ticket stops working when the room closes.

import { Logger } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type ParticipantRole = 'USER' | 'DOCTOR';

export interface RoomTicket {
  /** appointment id (= room name) */
  aid: string;
  role: ParticipantRole;
  /** User.id for the patient, Doctor.id for the doctor */
  pid: string;
  /** display name, e.g. "Dr. Ayesha Rahman" */
  name: string;
  /** expiry, unix seconds */
  exp: number;
}

const logger = new Logger('RoomTicket');
let cachedSecret: string | null = null;

function secret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.CONSULTATION_ROOM_SECRET || process.env.DOCTOR_JWT_SECRET || process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = fromEnv;
  } else {
    cachedSecret = randomBytes(32).toString('hex');
    logger.warn(
      'CONSULTATION_ROOM_SECRET is not set. Using a temporary secret: people in a consultation room ' +
        'reconnect automatically after an API restart. Add CONSULTATION_ROOM_SECRET to apps/api/.env.',
    );
  }
  return cachedSecret;
}

const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url');

export function signRoomTicket(ticket: RoomTicket): string {
  const body = Buffer.from(JSON.stringify({ ...ticket, typ: 'room' })).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** The ticket, or null when it is missing, tampered with or expired. */
export function verifyRoomTicket(token: string | undefined | null, now = Date.now()): RoomTicket | null {
  if (!token || typeof token !== 'string') return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const t = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (t.typ !== 'room' || !t.aid || !t.pid || (t.role !== 'USER' && t.role !== 'DOCTOR')) return null;
    if (typeof t.exp !== 'number' || t.exp * 1000 < now) return null;
    return { aid: t.aid, role: t.role, pid: t.pid, name: String(t.name ?? ''), exp: t.exp };
  } catch {
    return null;
  }
}

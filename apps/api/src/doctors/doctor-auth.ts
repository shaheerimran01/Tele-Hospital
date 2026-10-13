// Doctor-only authentication helpers.
//
// Doctors sign in with phone + OTP and get a signed token (a standard HS256 JWT,
// made with node:crypto so no extra package is needed). This is completely
// separate from patient accounts: it never touches the User table, and doctor
// OTPs are stored under a "doctor:" prefix so they can't be used in the patient
// or pharmacy OTP flows that share the OtpSession table.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Phone helpers (same normalisation as the pharmacy flow: +92XXXXXXXXXX)
// ---------------------------------------------------------------------------

export function formatDoctorPhone(phone: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('92') ? `+${digits}` : `+92${digits.replace(/^0+/, '')}`;
}

/** Ways the same number may already be stored (older rows weren't normalised). */
export function doctorPhoneVariants(phone: string): string[] {
  const formatted = formatDoctorPhone(phone);
  if (!formatted) return [];
  const national = formatted.slice(3); // 3001234567
  return Array.from(
    new Set([
      formatted,
      `92${national}`,
      `0${national}`,
      national,
      `+92 ${national.slice(0, 3)} ${national.slice(3)}`,
      `0${national.slice(0, 3)} ${national.slice(3)}`,
    ]),
  );
}

/** Key used in OtpSession.phone for doctor OTPs. */
export const doctorOtpKey = (formattedPhone: string) => `doctor:${formattedPhone}`;

/** "ayesha.rahman@gmail.com" -> "ay***@g***.com" */
export function maskEmail(email?: string | null): string | null {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  const dot = domain.lastIndexOf('.');
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  return `${local.slice(0, Math.min(2, local.length))}***@${host.charAt(0)}***${tld}`;
}

// ---------------------------------------------------------------------------
// Token (HS256 JWT)
// ---------------------------------------------------------------------------

export interface DoctorTokenPayload {
  sub: string; // DoctorRegistration.id
  phone: string; // verified phone, +92 format
  role: 'doctor';
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const logger = new Logger('DoctorAuth');

let cachedSecret: string | null = null;
function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.DOCTOR_JWT_SECRET || process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = fromEnv;
  } else {
    // Works for development, but every API restart logs all doctors out.
    cachedSecret = randomBytes(32).toString('hex');
    logger.warn(
      'DOCTOR_JWT_SECRET is not set (or shorter than 16 characters). Using a temporary secret: ' +
        'doctor sessions will end whenever the API restarts. Add DOCTOR_JWT_SECRET to apps/api/.env.',
    );
  }
  return cachedSecret;
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

function sign(data: string) {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function signDoctorToken(registrationId: string, phone: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: DoctorTokenPayload = {
    sub: registrationId,
    phone,
    role: 'doctor',
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const head = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}`;
  return `${head}.${sign(head)}`;
}

/** Returns the payload, or null when the token is missing, tampered with or expired. */
export function verifyDoctorToken(token: string | undefined | null): DoctorTokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${body}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const head = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (head.alg !== 'HS256') return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as DoctorTokenPayload;
    if (payload.role !== 'doctor' || !payload.sub || !payload.phone) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Guard + decorator
// ---------------------------------------------------------------------------

type RequestWithDoctor = {
  headers: Record<string, string | string[] | undefined>;
  doctorAuth?: DoctorTokenPayload;
};

/** Requires `Authorization: Bearer <doctor_token>`. */
@Injectable()
export class DoctorAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithDoctor>();
    const header = req.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    const token = value?.startsWith('Bearer ') ? value.slice(7).trim() : undefined;

    const payload = verifyDoctorToken(token);
    if (!payload) {
      throw new UnauthorizedException('Your doctor session has expired. Please verify your phone again.');
    }
    req.doctorAuth = payload;
    return true;
  }
}

/** The verified doctor token payload, for routes behind DoctorAuthGuard. */
export const CurrentDoctor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DoctorTokenPayload =>
    context.switchToHttp().getRequest<RequestWithDoctor>().doctorAuth!,
);

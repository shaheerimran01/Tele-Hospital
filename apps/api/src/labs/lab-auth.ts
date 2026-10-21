// Lab-only authentication helpers.
//
// Labs sign in with their primary phone + a 4-digit OTP and get a signed token
// (HS256 JWT made with node:crypto, like the doctor flow). The token carries the
// verified phone; the lab itself is looked up by that phone, so the same token
// works before registration (to register) and after (for the dashboard).
// Lab OTPs are stored under a "lab:" prefix in OtpSession so they can't be used
// in the patient, pharmacy or doctor flows.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** "0300 1234567" / "3001234567" / "+92 300-1234567" -> "+923001234567" */
export function formatLabPhone(phone: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('92') ? `+${digits}` : `+92${digits.replace(/^0+/, '')}`;
}

export const isPkMobile = (formatted: string) => /^\+923\d{9}$/.test(formatted);

/** Key used in OtpSession.phone for lab OTPs. */
export const labOtpKey = (formattedPhone: string) => `lab:${formattedPhone}`;

export interface LabTokenPayload {
  sub: string; // verified phone, +92 format
  phone: string;
  role: 'lab';
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const logger = new Logger('LabAuth');

let cachedSecret: string | null = null;
function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.LAB_JWT_SECRET || process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = fromEnv;
  } else {
    // Works for development, but every API restart signs all labs out.
    cachedSecret = randomBytes(32).toString('hex');
    logger.warn(
      'LAB_JWT_SECRET is not set (or shorter than 16 characters). Using a temporary secret: ' +
        'lab sessions will end whenever the API restarts. Add LAB_JWT_SECRET to apps/api/.env.',
    );
  }
  return cachedSecret;
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');
const sign = (data: string) => createHmac('sha256', getSecret()).update(data).digest('base64url');

export function signLabToken(phone: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: LabTokenPayload = { sub: phone, phone, role: 'lab', iat: now, exp: now + TOKEN_TTL_SECONDS };
  const head = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}`;
  return `${head}.${sign(head)}`;
}

/** Returns the payload, or null when the token is missing, tampered with or expired. */
export function verifyLabToken(token: string | undefined | null): LabTokenPayload | null {
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
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as LabTokenPayload;
    if (payload.role !== 'lab' || !payload.phone || !isPkMobile(payload.phone)) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

type RequestWithLab = {
  headers: Record<string, string | string[] | undefined>;
  labAuth?: LabTokenPayload;
};

/** Requires `Authorization: Bearer <lab_token>`. */
@Injectable()
export class LabAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithLab>();
    const header = req.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    const token = value?.startsWith('Bearer ') ? value.slice(7).trim() : undefined;
    const payload = verifyLabToken(token);
    if (!payload) throw new UnauthorizedException('Your lab session has expired. Please sign in with your phone again.');
    req.labAuth = payload;
    return true;
  }
}

/** The verified lab token payload, for routes behind LabAuthGuard. */
export const CurrentLab = createParamDecorator(
  (_data: unknown, context: ExecutionContext): LabTokenPayload => context.switchToHttp().getRequest<RequestWithLab>().labAuth!,
);

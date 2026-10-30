// One OTP service for every account type: USER (patients), DOCTOR, PHARMACY, LAB.
//
// - Codes are random (crypto.randomInt), 6 digits (LAB: 4, matching the lab sign-in screen).
// - Stored in OtpSession (no schema change): phone = "<role>:+923001234567",
//   otp = HMAC-SHA256 of the code (never the code itself), expiresAt = now + OTP_EXPIRY_MINUTES.
// - Rate limits: 3 codes per phone number per 10 minutes (all roles together),
//   30 seconds between codes, 5 wrong attempts burn the code.
// - Delivery: ENABLE_WHATSAPP_OTP=true -> WhatsApp template (code never logged);
//   otherwise the code is printed in the API console for local testing.

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsAppSendError, WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { maskPhone, toE164Pk, toWhatsAppNumber } from './phone.js';

export const OTP_ROLES = ['USER', 'DOCTOR', 'PHARMACY', 'LAB'] as const;
export type OtpRole = (typeof OTP_ROLES)[number];

/** Code length per account type (the existing sign-in screens are built for these) */
export const OTP_LENGTH: Record<OtpRole, number> = { USER: 6, DOCTOR: 6, PHARMACY: 6, LAB: 4 };

const ROLE_LABEL: Record<OtpRole, string> = { USER: 'Patient', DOCTOR: 'Doctor', PHARMACY: 'Pharmacy', LAB: 'Lab' };

const envInt = (name: string, fallback: number, min: number, max: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : fallback;
};

/** OtpSession.phone for a role, e.g. "lab:+923001234567" (doctor:/lab: match the older flows) */
export const otpKey = (role: OtpRole, e164: string) => `${role.toLowerCase()}:${e164}`;

export interface OtpSent {
  /** +923001234567 */
  phone: string;
  role: OtpRole;
  channel: 'whatsapp' | 'console';
  codeLength: number;
  expiresInMinutes: number;
  resendAfterSeconds: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger('OTP');
  /** wrong-code counter per OtpSession id (in memory) */
  private readonly attempts = new Map<string, number>();
  private secret: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  get expiryMinutes() {
    return envInt('OTP_EXPIRY_MINUTES', 5, 1, 30);
  }
  private get resendSeconds() {
    return envInt('OTP_RESEND_SECONDS', 30, 0, 600);
  }
  private get maxRequests() {
    return envInt('OTP_RATE_LIMIT_MAX', 3, 1, 50);
  }
  private get windowMinutes() {
    return envInt('OTP_RATE_LIMIT_WINDOW_MINUTES', 10, 1, 1440);
  }
  private get maxAttempts() {
    return envInt('OTP_MAX_ATTEMPTS', 5, 1, 20);
  }

  /** "+923001234567" or a 400 with a clear message */
  normalizePhone(phone: string | null | undefined): string {
    const e164 = toE164Pk(phone);
    if (!e164) throw new BadRequestException('Enter a valid Pakistani mobile number, e.g. 0300 1234567.');
    return e164;
  }

  private hash(key: string, code: string) {
    if (!this.secret) {
      const fromEnv = process.env.OTP_HASH_SECRET?.trim();
      if (fromEnv && fromEnv.length >= 16) this.secret = fromEnv;
      else {
        // Codes still work, but ones issued before an API restart stop matching
        this.secret = randomBytes(32).toString('hex');
        this.logger.warn('OTP_HASH_SECRET is not set (or shorter than 16 characters); using a temporary secret. Add it to apps/api/.env.');
      }
    }
    return `h1$${createHmac('sha256', this.secret).update(`${key}:${code}`).digest('hex')}`;
  }

  // ---------------------------------------------------------------------------
  // Send
  // ---------------------------------------------------------------------------

  async send(role: OtpRole, rawPhone: string): Promise<OtpSent> {
    const phone = this.normalizePhone(rawPhone);
    const key = otpKey(role, phone);
    const now = Date.now();

    // 3 codes per number per 10 minutes, counted across all account types
    const windowStart = new Date(now - this.windowMinutes * 60_000);
    const recent = await this.prisma.otpSession.findMany({
      where: { phone: { in: OTP_ROLES.map((r) => otpKey(r, phone)) }, createdAt: { gt: windowStart } },
      orderBy: { createdAt: 'asc' },
      select: { phone: true, createdAt: true },
    });
    if (recent.length >= this.maxRequests) {
      const freeAt = recent[recent.length - this.maxRequests].createdAt.getTime() + this.windowMinutes * 60_000;
      const wait = Math.max(1, Math.ceil((freeAt - now) / 1000));
      throw tooMany(
        `Too many OTP requests for this number. Please try again in ${wait >= 60 ? `${Math.ceil(wait / 60)} minute${Math.ceil(wait / 60) === 1 ? '' : 's'}` : `${wait} seconds`}.`,
        wait,
      );
    }
    const last = [...recent].reverse().find((r) => r.phone === key);
    if (last && now - last.createdAt.getTime() < this.resendSeconds * 1000) {
      const wait = Math.max(1, Math.ceil((last.createdAt.getTime() + this.resendSeconds * 1000 - now) / 1000));
      throw tooMany(`Please wait ${wait} seconds before requesting a new OTP.`, wait);
    }

    const length = OTP_LENGTH[role];
    const code = randomInt(0, 10 ** length).toString().padStart(length, '0');
    const session = await this.prisma.otpSession.create({
      data: { phone: key, otp: this.hash(key, code), expiresAt: new Date(now + this.expiryMinutes * 60_000) },
      select: { id: true },
    });

    let channel: OtpSent['channel'] = 'console';
    if (this.whatsapp.enabled) {
      if (!this.whatsapp.templateCarriesCode && process.env.NODE_ENV === 'production') {
        await this.discard(session.id);
        this.logger.error('WHATSAPP_TEMPLATE_NAME is "hello_world", which cannot carry the OTP code. Set an approved OTP template.');
        throw new ServiceUnavailableException('We could not send the verification code right now. Please try again later.');
      }
      try {
        await this.whatsapp.sendOtp(toWhatsAppNumber(phone)!, code);
        channel = 'whatsapp';
      } catch (err) {
        await this.discard(session.id);
        if (err instanceof WhatsAppSendError && err.recipientProblem) {
          throw new BadRequestException('This number does not seem to be on WhatsApp. Please check the number and try again.');
        }
        throw new ServiceUnavailableException('We could not send the code on WhatsApp right now. Please try again in a minute.');
      }
      if (!this.whatsapp.templateCarriesCode) {
        // Development only (blocked in production above): hello_world proves delivery but has no code in it
        this.printCode(role, phone, code, 'hello_world template has no code variable');
      }
    } else {
      this.printCode(role, phone, code, 'ENABLE_WHATSAPP_OTP=false');
    }

    return {
      phone,
      role,
      channel,
      codeLength: length,
      expiresInMinutes: this.expiryMinutes,
      resendAfterSeconds: this.resendSeconds,
    };
  }

  private printCode(role: OtpRole, phone: string, code: string, reason: string) {
    this.logger.warn(`\n==============================\n${ROLE_LABEL[role]} OTP for ${phone}: ${code}\n(${reason}; not sent by WhatsApp)\n==============================`);
  }

  private async discard(id: string) {
    await this.prisma.otpSession.delete({ where: { id } }).catch(() => undefined);
  }

  // ---------------------------------------------------------------------------
  // Verify
  // ---------------------------------------------------------------------------

  /** Checks the latest code for this phone + role and marks it used. Returns the +92 phone. */
  async verify(role: OtpRole, rawPhone: string, rawCode: string): Promise<{ phone: string; role: OtpRole }> {
    const phone = this.normalizePhone(rawPhone);
    const key = otpKey(role, phone);
    const length = OTP_LENGTH[role];
    const code = String(rawCode ?? '').replace(/\s/g, '');
    if (!new RegExp(`^\\d{${length}}$`).test(code)) throw new BadRequestException(`OTP must be ${length} digits.`);

    const session = await this.prisma.otpSession.findFirst({
      where: { phone: key, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) throw new BadRequestException('No OTP found. Please request a new one.');
    if (session.expiresAt < new Date()) throw new BadRequestException('This OTP has expired. Please request a new one.');

    // Codes from before this service were stored as plain text
    const expected = session.otp;
    const given = expected.startsWith('h1$') ? this.hash(key, code) : code;
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      const tries = (this.attempts.get(session.id) ?? 0) + 1;
      if (tries >= this.maxAttempts) {
        // Burn the code so it can't be guessed
        this.attempts.delete(session.id);
        await this.prisma.otpSession.update({ where: { id: session.id }, data: { verifiedAt: new Date() } });
        this.logger.warn(`${ROLE_LABEL[role]} OTP for ${maskPhone(phone)} locked after ${tries} wrong attempts.`);
        throw new BadRequestException('Too many wrong attempts. Please request a new OTP.');
      }
      this.attempts.set(session.id, tries);
      const left = this.maxAttempts - tries;
      throw new BadRequestException(`Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.`);
    }

    // Single use: only the request that flips verifiedAt wins
    const used = await this.prisma.otpSession.updateMany({ where: { id: session.id, verifiedAt: null }, data: { verifiedAt: new Date() } });
    this.attempts.delete(session.id);
    if (used.count === 0) throw new BadRequestException('This OTP was already used. Please request a new one.');
    return { phone, role };
  }
}

function tooMany(message: string, retryAfterSeconds: number) {
  return new HttpException({ statusCode: HttpStatus.TOO_MANY_REQUESTS, message, retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
}

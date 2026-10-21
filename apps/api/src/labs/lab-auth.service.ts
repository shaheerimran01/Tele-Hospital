import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { SendLabOtpDto, VerifyLabOtpDto } from './dto/lab-portal.dto.js';
import { formatLabPhone, labOtpKey, signLabToken } from './lab-auth.js';

const OTP_TTL_MINUTES = 5;
const OTP_RESEND_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;

/** What the sign-in screen needs to route the user */
const LAB_SUMMARY = { id: true, name: true, logoUrl: true, verificationStatus: true } as const;

@Injectable()
export class LabAuthService {
  /** Wrong-OTP counter per phone (in memory; resets when the API restarts). */
  private readonly otpAttempts = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  findLabByPhone(phone: string) {
    return this.prisma.laboratory.findUnique({ where: { phone }, select: LAB_SUMMARY });
  }

  /** POST /labs/auth/send-otp */
  async sendOtp(dto: SendLabOtpDto) {
    const phone = formatLabPhone(dto.phone);
    const key = labOtpKey(phone);

    // One OTP per 30 seconds per phone
    const recent = await this.prisma.otpSession.findFirst({
      where: { phone: key, createdAt: { gt: new Date(Date.now() - OTP_RESEND_SECONDS * 1000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const wait = Math.ceil((recent.createdAt.getTime() + OTP_RESEND_SECONDS * 1000 - Date.now()) / 1000);
      throw new BadRequestException(`Please wait ${Math.max(wait, 1)} seconds before requesting a new OTP.`);
    }

    const otp = randomInt(1000, 10000).toString();
    await this.prisma.otpSession.create({
      data: { phone: key, otp, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000) },
    });
    this.otpAttempts.delete(key);

    // DEV: no SMS provider yet, so the OTP is printed in the API terminal
    console.log(`\n==============================`);
    console.log(`🧪 Lab OTP for ${phone}: ${otp}`);
    console.log(`==============================\n`);

    return { success: true, phone, resendAfterSeconds: OTP_RESEND_SECONDS, expiresInMinutes: OTP_TTL_MINUTES };
  }

  /** POST /labs/auth/verify-otp -> token + whether this phone already has a lab */
  async verifyOtp(dto: VerifyLabOtpDto) {
    const phone = formatLabPhone(dto.phone);
    const key = labOtpKey(phone);

    const session = await this.prisma.otpSession.findFirst({
      where: { phone: key, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) throw new BadRequestException('No OTP found. Please request a new one.');
    if (session.expiresAt < new Date()) throw new BadRequestException('This OTP has expired. Please request a new one.');

    const given = Buffer.from(dto.otp);
    const expected = Buffer.from(session.otp);
    const matches = given.length === expected.length && timingSafeEqual(given, expected);
    if (!matches) {
      const attempts = (this.otpAttempts.get(key) ?? 0) + 1;
      this.otpAttempts.set(key, attempts);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        // Burn the code so it can't be guessed
        await this.prisma.otpSession.update({ where: { id: session.id }, data: { verifiedAt: new Date() } });
        this.otpAttempts.delete(key);
        throw new BadRequestException('Too many wrong attempts. Please request a new OTP.');
      }
      const left = OTP_MAX_ATTEMPTS - attempts;
      throw new BadRequestException(`Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.`);
    }

    await this.prisma.otpSession.update({ where: { id: session.id }, data: { verifiedAt: new Date() } });
    this.otpAttempts.delete(key);

    const laboratory = await this.findLabByPhone(phone);
    return { success: true, token: signLabToken(phone), phone, registered: Boolean(laboratory), laboratory };
  }

  /** GET /labs/auth/me */
  async me(phone: string) {
    const laboratory = await this.findLabByPhone(phone);
    return { phone, registered: Boolean(laboratory), laboratory };
  }
}

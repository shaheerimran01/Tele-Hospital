import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from '../otp/otp.service.js';
import { SendLabOtpDto, VerifyLabOtpDto } from './dto/lab-portal.dto.js';
import { signLabToken } from './lab-auth.js';

/** What the sign-in screen needs to route the user */
const LAB_SUMMARY = { id: true, name: true, logoUrl: true, verificationStatus: true } as const;

@Injectable()
export class LabAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
  ) {}

  findLabByPhone(phone: string) {
    return this.prisma.laboratory.findUnique({ where: { phone }, select: LAB_SUMMARY });
  }

  /** POST /labs/auth/send-otp (4-digit code by WhatsApp; see OtpService) */
  async sendOtp(dto: SendLabOtpDto) {
    const sent = await this.otp.send('LAB', dto.phone);
    return {
      success: true,
      phone: sent.phone,
      channel: sent.channel,
      resendAfterSeconds: sent.resendAfterSeconds,
      expiresInMinutes: sent.expiresInMinutes,
    };
  }

  /** POST /labs/auth/verify-otp -> token + whether this phone already has a lab */
  async verifyOtp(dto: VerifyLabOtpDto) {
    const { phone } = await this.otp.verify('LAB', dto.phone, dto.otp);
    const laboratory = await this.findLabByPhone(phone);
    return { success: true, token: signLabToken(phone), phone, registered: Boolean(laboratory), laboratory };
  }

  /** GET /labs/auth/me */
  async me(phone: string) {
    const laboratory = await this.findLabByPhone(phone);
    return { phone, registered: Boolean(laboratory), laboratory };
  }
}

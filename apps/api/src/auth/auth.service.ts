import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { OTP_LENGTH, OtpService, type OtpRole } from '../otp/otp.service.js';
import { pkPhoneVariants } from '../otp/phone.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { PharmaciesService } from '../pharmacies/pharmacies.service.js';
import { LabAuthService } from '../labs/lab-auth.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly doctors: DoctorsService,
    private readonly pharmacies: PharmaciesService,
    private readonly labAuth: LabAuthService,
  ) {}

  /** POST /auth/send-otp */
  async sendOtp(dto: SendOtpDto) {
    const role: OtpRole = dto.role ?? 'USER';
    const extra = { role, codeLength: OTP_LENGTH[role] };
    switch (role) {
      case 'DOCTOR':
        return { ...(await this.doctors.sendOtp({ phone: dto.phone })), ...extra };
      case 'PHARMACY':
        return { ...(await this.pharmacies.sendPharmacyOtp(dto.phone)), ...extra };
      case 'LAB':
        return { ...(await this.labAuth.sendOtp({ phone: dto.phone })), ...extra };
      default: {
        const sent = await this.otp.send('USER', dto.phone);
        return {
          success: true,
          message: sent.channel === 'whatsapp' ? 'OTP sent on WhatsApp' : 'OTP sent successfully',
          phone: sent.phone,
          channel: sent.channel,
          resendAfterSeconds: sent.resendAfterSeconds,
          expiresInMinutes: sent.expiresInMinutes,
          ...extra,
        };
      }
    }
  }

  /** POST /auth/verify-otp */
  async verifyOtp(dto: VerifyOtpDto) {
    const role: OtpRole = dto.role ?? 'USER';
    const code = dto.code || dto.otp;
    if (!code) throw new BadRequestException('Enter the OTP code.');
    const extra = { verified: true, role };
    switch (role) {
      case 'DOCTOR':
        return { ...(await this.doctors.verifyOtp({ phone: dto.phone, otp: code })), ...extra };
      case 'PHARMACY':
        return { ...(await this.pharmacies.verifyPharmacyOtp(dto.phone, code)), ...extra };
      case 'LAB':
        return { ...(await this.labAuth.verifyOtp({ phone: dto.phone, otp: code })), ...extra };
      default: {
        const { phone } = await this.otp.verify('USER', dto.phone, code);
        const user = await this.prisma.user.findFirst({ where: { phone: { in: pkPhoneVariants(phone) } } });
        return {
          success: true,
          message: 'OTP verified successfully',
          phone,
          exists: Boolean(user),
          user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email } : null,
          ...extra,
        };
      }
    }
  }

  async checkAccount(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    return {
      exists: !!user,
      user: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
          }
        : null,
    };
  }

  async createAccount(createAccountDto: CreateAccountDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: createAccountDto.phone },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this phone number already exists.',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        phone: createAccountDto.phone,
        firstName: createAccountDto.firstName,
        lastName: createAccountDto.lastName,
        email: createAccountDto.email || null,
        healthcareProfessional:
          createAccountDto.healthcareProfessional ?? false,
      },
    });

    return {
      message: 'Account created successfully',
      userId: user.id,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
      },
    };
  }

  async login(body: { email?: string; phone?: string; password?: string }) {
    const identifier = body.email?.trim() || body.phone?.trim();
    if (!identifier) {
      throw new BadRequestException('Please provide an email or phone number.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });

    if (!user) {
      throw new BadRequestException('No account found with this email or phone. Please sign up first.');
    }

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
      },
    };
  }

  async register(body: { name?: string; email?: string; phone?: string; password?: string }) {
    const email = body.email?.trim();
    const phone = body.phone?.trim();

    if (!email && !phone) {
      throw new BadRequestException('Email or phone number is required.');
    }

    const conditions: any[] = [];
    if (email) conditions.push({ email });
    if (phone) conditions.push({ phone });

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: conditions },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email or phone already exists. Please login.');
    }

    const nameParts = (body.name || '').trim().split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    const user = await this.prisma.user.create({
      data: {
        email: email || null,
        phone: phone || null,
        firstName,
        lastName,
      },
    });

    return {
      message: 'Registration successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
      },
    };
  }
}
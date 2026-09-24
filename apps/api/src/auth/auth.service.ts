import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async sendOtp(phone: string) {
    // 1. Generate 6 digit OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // 2. OTP expires after 2 minutes
    const expiresAt = new Date(
      Date.now() + 2 * 60 * 1000,
    );

    // 3. Save OTP in database
    await this.prisma.otpSession.create({
      data: {
        phone,
        otp,
        expiresAt,
      },
    });

    // Development only
    console.log(`OTP for ${phone}: ${otp}`);

    return {
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(phone: string, otp: string) {
    // Find latest OTP for this phone
    const otpSession =
      await this.prisma.otpSession.findFirst({
        where: {
          phone,
          verifiedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    if (!otpSession) {
      throw new BadRequestException(
        'OTP not found',
      );
    }

    // Check expiry
    if (otpSession.expiresAt < new Date()) {
      throw new BadRequestException(
        'OTP has expired',
      );
    }

    // Check OTP
    if (otpSession.otp !== otp) {
      throw new BadRequestException(
        'Invalid OTP',
      );
    }

    // Mark OTP as verified
    await this.prisma.otpSession.update({
      where: {
        id: otpSession.id,
      },
      data: {
        verifiedAt: new Date(),
      },
    });

    return {
      message: 'OTP verified successfully',
    };
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
}
import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from '../otp/otp.service.js';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto.js';

@Injectable()
export class PharmaciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
  ) {}

  private formatPhone(phone: string): string {
    if (!phone) return '';
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits) return '';
    return cleanDigits.startsWith('92')
      ? `+${cleanDigits}`
      : `+92${cleanDigits.replace(/^0+/, '')}`;
  }

  private getPhoneVariants(phone: string): string[] {
    if (!phone) return [];
    const formatted = this.formatPhone(phone);
    const cleanDigits = phone.replace(/\D/g, '');

    const localWithZero = cleanDigits.startsWith('92')
      ? `0${cleanDigits.slice(2)}`
      : `0${cleanDigits.replace(/^0+/, '')}`;

    const rawWithoutZero = cleanDigits.startsWith('92')
      ? cleanDigits.slice(2)
      : cleanDigits.replace(/^0+/, '');

    return Array.from(new Set([
      formatted,
      localWithZero,
      cleanDigits,
      rawWithoutZero,
      `+${cleanDigits}`
    ]));
  }

  // -------------------------------------------------------------
  // AUTH METHODS
  // -------------------------------------------------------------
  async sendPharmacyOtp(phone: string) {
    if (!phone) throw new BadRequestException('Phone number is required');
    // 6-digit code by WhatsApp (or the API console when ENABLE_WHATSAPP_OTP=false); see OtpService
    const sent = await this.otp.send('PHARMACY', phone);
    return {
      success: true,
      message: sent.channel === 'whatsapp' ? 'OTP sent on WhatsApp' : 'OTP sent successfully',
      phone: sent.phone,
      channel: sent.channel,
      resendAfterSeconds: sent.resendAfterSeconds,
      expiresInMinutes: sent.expiresInMinutes,
    };
  }

  async verifyPharmacyOtp(phone: string, otp: string) {
    if (!phone || !otp) throw new BadRequestException('Phone and OTP are required');

    const { phone: formattedPhone } = await this.otp.verify('PHARMACY', phone, otp);
    const phoneVariants = this.getPhoneVariants(phone);

    const reg = await this.prisma.pharmacyRegistration.findFirst({
      where: { phone: { in: phoneVariants } },
    });

    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          { whatsappNumber: { in: phoneVariants } },
        ],
      },
    });

    const exists = Boolean(reg || pharmacy);
    // isFormFilled is true if a Pharmacy record exists (fully submitted) OR
    // if the PharmacyRegistration row has been marked as filled (form submitted, pending review)
    const isFormFilled = Boolean(pharmacy || reg?.isFormFilled);

    return {
      success: true,
      phone: formattedPhone,
      email: pharmacy?.email || reg?.email || null,
      pharmacyId: pharmacy?.id || null,
      pharmacyRegId: reg?.id || null,
      exists,
      isFormFilled,
      redirectTo: isFormFilled ? '/pharmacy-dashboard' : '/pharmacy-register',
    };
  }


  async initRegistration(phone: string, email?: string) {
    if (!phone) throw new BadRequestException('Phone number is required');

    const formattedPhone = this.formatPhone(phone);
    const phoneVariants = this.getPhoneVariants(phone);
    const cleanEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : null;

    const existingPharmacy = await this.prisma.pharmacy.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          { whatsappNumber: { in: phoneVariants } },
        ],
      },
    });

    const existingReg = await this.prisma.pharmacyRegistration.findFirst({
      where: { phone: { in: phoneVariants } },
    });

    if (existingPharmacy || existingReg?.isFormFilled) {
      return {
        success: true,
        alreadyRegistered: true,
        message: 'User is already registered.',
        pharmacyId: existingPharmacy?.id || null,
        redirectTo: '/pharmacy-dashboard',
      };
    }

    const targetPhone = existingReg ? existingReg.phone : formattedPhone;

    const reg = await this.prisma.pharmacyRegistration.upsert({
      where: { phone: targetPhone },
      update: { ...(cleanEmail && { email: cleanEmail }) },
      create: {
        phone: formattedPhone,
        email: cleanEmail,
        isFormFilled: false,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      alreadyRegistered: false,
      message: 'Registration initialized successfully',
      pharmacyRegistration: reg,
    };
  }

  // -------------------------------------------------------------
  // FORM SUBMISSION
  // -------------------------------------------------------------
  async create(createPharmacyDto: CreatePharmacyDto, uploadedFiles?: {
    logoUrl?: string;
    drugLicensePhotoUrl?: string;
    cnicFrontPhotoUrl?: string;
    cnicBackPhotoUrl?: string;
  }) {
    try {
      const rawPhone = createPharmacyDto.phone || createPharmacyDto.whatsappNumber || '';
      
      if (!rawPhone) {
        throw new BadRequestException('Phone number is required to register a pharmacy.');
      }

      const primaryPhone = this.formatPhone(rawPhone);
      const whatsappPhone = createPharmacyDto.whatsappNumber ? this.formatPhone(createPharmacyDto.whatsappNumber) : null;

      const allPhoneVariants = Array.from(new Set([
        ...this.getPhoneVariants(primaryPhone),
        ...(whatsappPhone ? this.getPhoneVariants(whatsappPhone) : []),
      ]));

      // Existing Registration record se email/phone fallback fetch karein
      const existingReg = await this.prisma.pharmacyRegistration.findFirst({
        where: { phone: { in: allPhoneVariants } },
      });

      const finalEmail = createPharmacyDto.email?.trim().toLowerCase() || existingReg?.email || null;
      const finalPhone = primaryPhone || existingReg?.phone || null;

      // 1. Create Pharmacy Record
      const pharmacy = await this.prisma.pharmacy.create({
        data: {
          name: createPharmacyDto.name,
          ownerName: createPharmacyDto.ownerName,
          pharmacyType: createPharmacyDto.pharmacyType || 'Retail',
          pharmacistName: createPharmacyDto.pharmacistName,
          pharmacistRegNum: createPharmacyDto.pharmacistRegNum,
          logoUrl: uploadedFiles?.logoUrl || createPharmacyDto.logoUrl || null,
          whatsappNumber: whatsappPhone || finalPhone,
          phone: finalPhone,
          email: finalEmail,

          drugLicenseNumber: createPharmacyDto.drugLicenseNumber,
          drugLicensePhotoUrl: uploadedFiles?.drugLicensePhotoUrl || createPharmacyDto.drugLicensePhotoUrl || null,
          cnicNtnNumber: createPharmacyDto.cnicNtnNumber,
          cnicFrontPhotoUrl: uploadedFiles?.cnicFrontPhotoUrl || createPharmacyDto.cnicFrontPhotoUrl || null,
          cnicBackPhotoUrl: uploadedFiles?.cnicBackPhotoUrl || createPharmacyDto.cnicBackPhotoUrl || null,

          city: createPharmacyDto.city,
          address: createPharmacyDto.address,
          latitude: createPharmacyDto.latitude ? parseFloat(String(createPharmacyDto.latitude)) : null,
          longitude: createPharmacyDto.longitude ? parseFloat(String(createPharmacyDto.longitude)) : null,
          isOpen247: createPharmacyDto.isOpen247 === true || (createPharmacyDto.isOpen247 as any) === 'true',

          paymentMethod: createPharmacyDto.paymentMethod || 'JazzCash',
          accountTitle: createPharmacyDto.accountTitle,
          accountNumber: createPharmacyDto.accountNumber,
          coldChainStorage: createPharmacyDto.coldChainStorage === true || (createPharmacyDto.coldChainStorage as any) === 'true',
          referralCode: createPharmacyDto.referralCode || null,
          agreedToTerms: createPharmacyDto.agreedToTerms === true || (createPharmacyDto.agreedToTerms as any) === 'true',

          status: 'PENDING',
          isActive: false,
        },
      });

      // 2. Mark isFormFilled: true in PharmacyRegistration table
      if (allPhoneVariants.length > 0) {
        await this.prisma.pharmacyRegistration.updateMany({
          where: { phone: { in: allPhoneVariants } },
          data: {
            isFormFilled: true,
            status: 'PENDING',
            ...(finalEmail && { email: finalEmail }),
          },
        });
      }

      // 3. Admin Notification
      await this.prisma.notification.create({
        data: {
          type: 'NEW_PHARMACY_REGISTRATION',
          title: 'New Pharmacy Application',
          message: `${pharmacy.name} (${pharmacy.city || 'Pakistan'}) has submitted a new pharmacy registration application.`,
          pharmacyId: pharmacy.id,
          isRead: false,
        },
      });

      return {
        message: 'Pharmacy application submitted successfully',
        pharmacy,
      };
    } catch (error) {
      console.error('Pharmacy creation error:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to submit pharmacy registration application');
    }
  }

  async findAll() {
    return this.prisma.pharmacy.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string) {
    return this.prisma.pharmacy.findUnique({
      where: { id },
      include: { products: { include: { product: true } } },
    });
  }

  async updateStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING', isActive?: boolean) {
    return this.prisma.pharmacy.update({
      where: { id },
      data: {
        status,
        isActive: isActive !== undefined ? isActive : status === 'APPROVED',
      },
    });
  }
}
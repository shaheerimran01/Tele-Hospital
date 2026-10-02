import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto.js';

@Injectable()
export class PharmaciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPharmacyDto: CreatePharmacyDto, uploadedFiles?: {
    logoUrl?: string;
    drugLicensePhotoUrl?: string;
    cnicFrontPhotoUrl?: string;
    cnicBackPhotoUrl?: string;
  }) {
    try {
      // Merge File URLs if passed via Multer
      const logoUrl = uploadedFiles?.logoUrl || createPharmacyDto.logoUrl;
      const drugLicensePhotoUrl = uploadedFiles?.drugLicensePhotoUrl || createPharmacyDto.drugLicensePhotoUrl;
      const cnicFrontPhotoUrl = uploadedFiles?.cnicFrontPhotoUrl || createPharmacyDto.cnicFrontPhotoUrl;
      const cnicBackPhotoUrl = uploadedFiles?.cnicBackPhotoUrl || createPharmacyDto.cnicBackPhotoUrl;

      // Safely Parse Float Coordinates
      const parsedLat = createPharmacyDto.latitude 
        ? parseFloat(String(createPharmacyDto.latitude)) 
        : null;

      const parsedLng = createPharmacyDto.longitude 
        ? parseFloat(String(createPharmacyDto.longitude)) 
        : null;

      // 1. Save Pharmacy Record in DB
      const pharmacy = await this.prisma.pharmacy.create({
        data: {
          name: createPharmacyDto.name,
          ownerName: createPharmacyDto.ownerName,
          pharmacyType: createPharmacyDto.pharmacyType || 'Retail',
          pharmacistName: createPharmacyDto.pharmacistName,
          pharmacistRegNum: createPharmacyDto.pharmacistRegNum,
          logoUrl: logoUrl || null,
          whatsappNumber: createPharmacyDto.whatsappNumber || null,
          phone: createPharmacyDto.phone || createPharmacyDto.whatsappNumber || null,
          email: createPharmacyDto.email || null,

          drugLicenseNumber: createPharmacyDto.drugLicenseNumber,
          drugLicensePhotoUrl: drugLicensePhotoUrl || null,
          cnicNtnNumber: createPharmacyDto.cnicNtnNumber,
          cnicFrontPhotoUrl: cnicFrontPhotoUrl || null,
          cnicBackPhotoUrl: cnicBackPhotoUrl || null,

          city: createPharmacyDto.city,
          address: createPharmacyDto.address,
          latitude: Number.isNaN(parsedLat) ? null : parsedLat,
          longitude: Number.isNaN(parsedLng) ? null : parsedLng,
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

      // 2. TRIGGER NOTIFICATION FOR ADMIN
      await this.prisma.notification.create({
        data: {
          type: 'NEW_PHARMACY_REGISTRATION',
          title: 'New Pharmacy Application',
          message: `${pharmacy.name} (${pharmacy.city}) has submitted a new pharmacy registration application.`,
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
      throw new InternalServerErrorException(
        'Failed to submit pharmacy registration application',
      );
    }
  }

  // Get All Pharmacies (For Admin panel)
  async findAll() {
    return this.prisma.pharmacy.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  // Get Single Pharmacy Details
  async findOne(id: string) {
    return this.prisma.pharmacy.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  // Update Pharmacy Status (Approve/Reject)
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
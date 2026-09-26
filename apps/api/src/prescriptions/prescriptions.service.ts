import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPrescription(
    userId: string,
    file: Express.Multer.File,
  ) {
    return this.prisma.prescription.create({
      data: {
        userId,
        fileName: file.originalname,
        fileUrl: `/uploads/prescriptions/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size,
      },
    });
  }

  // 👈 Added unattachedOnly parameter
  async getUserPrescriptions(userId: string, unattachedOnly = false) {
    return this.prisma.prescription.findMany({
      where: {
        userId,
        ...(unattachedOnly ? { orderId: null } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPrescription(id: string, userId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  async deletePrescription(id: string, userId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return this.prisma.prescription.delete({
      where: {
        id,
      },
    });
  }
}
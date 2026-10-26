import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateLabPrescriptionDto,
  LabPrescriptionQueryDto,
} from './dto/create-lab-prescription.dto.js';
import { buildLabPrescriptionPdf } from './lab-prescription-pdf.js';

const UPLOAD_ROOT = join(process.cwd(), 'uploads');
const LAB_REPORTS_DIR = 'lab-reports';

@Injectable()
export class LabPrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /lab-prescriptions
   * Creates a structured LabPrescription record, generates PDF, links to LabOrder, and notifies user.
   */
  async createLabPrescription(dto: CreateLabPrescriptionDto) {
    if (!dto.labOrderId) {
      throw new BadRequestException('Lab Order ID is required');
    }

    // 1. Fetch linked LabOrder
    const order = await this.prisma.labOrder.findFirst({
      where: {
        OR: [{ id: dto.labOrderId }, { orderNumber: dto.labOrderId }],
      },
      include: {
        laboratory: true,
        user: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Lab order not found: ${dto.labOrderId}`);
    }

    const laboratoryId = dto.laboratoryId || order.laboratoryId;
    const userId = dto.userId || order.userId;

    // 2. Format PDF Data
    const reportDateStr = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const pdfBuffer = buildLabPrescriptionPdf({
      laboratory: {
        name: order.laboratory?.name || 'Tabibistan Partner Laboratory',
        phone: order.laboratory?.phone || null,
        address: (order.laboratory as any)?.address || 'Clinical Diagnostic Center',
      },
      orderNumber: order.orderNumber,
      reportDate: reportDateStr,
      patient: {
        name: dto.patientName || order.patientName,
        age: dto.patientAge || order.patientAge,
        gender: dto.patientGender || order.patientGender,
        phone: order.patientPhone,
      },
      pathologist: {
        name: dto.pathologistName || 'Dr. Asad Malik (Consultant Pathologist)',
        signUrl: dto.pathologistSignUrl || null,
      },
      testResults: dto.testResults || [],
      remarks: dto.remarks || null,
      instructions: dto.instructions || null,
    });

    // 3. Write PDF to /uploads/lab-reports/
    const reportsFolder = join(UPLOAD_ROOT, LAB_REPORTS_DIR);
    await mkdir(reportsFolder, { recursive: true });

    const safeOrderNum = order.orderNumber.replace(/[^A-Za-z0-9-]/g, '');
    const fileName = `${safeOrderNum}-${Date.now()}-${randomUUID().slice(0, 8)}.pdf`;
    const fullPath = join(reportsFolder, fileName);
    await writeFile(fullPath, pdfBuffer);

    const pdfUrl = `/uploads/${LAB_REPORTS_DIR}/${fileName}`;

    // 4. Save LabPrescription and update LabOrder in transaction
    const prescription = await this.prisma.$transaction(async (tx) => {
      // Create or update LabPrescription
      const record = await tx.labPrescription.upsert({
        where: { labOrderId: order.id },
        create: {
          labOrderId: order.id,
          laboratoryId,
          userId,
          pathologistName: dto.pathologistName || 'Dr. Asad Malik (Consultant Pathologist)',
          pathologistSignUrl: dto.pathologistSignUrl || null,
          patientName: dto.patientName || order.patientName,
          patientAge: dto.patientAge || order.patientAge || null,
          patientGender: dto.patientGender || order.patientGender || null,
          testResults: (dto.testResults || []) as any,
          remarks: dto.remarks || null,
          instructions: dto.instructions || null,
          pdfUrl,
        },
        update: {
          pathologistName: dto.pathologistName || 'Dr. Asad Malik (Consultant Pathologist)',
          pathologistSignUrl: dto.pathologistSignUrl || null,
          patientName: dto.patientName || order.patientName,
          patientAge: dto.patientAge || order.patientAge || null,
          patientGender: dto.patientGender || order.patientGender || null,
          testResults: (dto.testResults || []) as any,
          remarks: dto.remarks || null,
          instructions: dto.instructions || null,
          pdfUrl,
        },
        include: {
          labOrder: {
            include: {
              items: true,
              laboratory: {
                select: { id: true, name: true, phone: true, logoUrl: true },
              },
            },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
          },
        },
      });

      // Update linked LabOrder with report file URL & status
      await tx.labOrder.update({
        where: { id: order.id },
        data: {
          reportFileUrl: pdfUrl,
          reportUploadedAt: new Date(),
          status: 'REPORT_UPLOADED',
        },
      });

      // Insert UserNotification for patient
      await tx.userNotification.create({
        data: {
          userId,
          title: 'Diagnostic Report Ready',
          message: `Your diagnostic lab report for order #${order.orderNumber} is ready to view.`,
          type: 'LAB_REPORT_READY',
          isRead: false,
        },
      });

      return record;
    });

    return prescription;
  }

  /**
   * GET /lab-prescriptions/lab/:laboratoryId
   * List all generated lab reports for a partner laboratory with pagination & search
   */
  async getLabPrescriptionsByLab(laboratoryId: string, query: LabPrescriptionQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { laboratoryId };

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { patientName: { contains: q, mode: 'insensitive' } },
        { labOrder: { orderNumber: { contains: q, mode: 'insensitive' } } },
        { pathologistName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.labPrescription.count({ where }),
      this.prisma.labPrescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          labOrder: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              scheduledDate: true,
              timeSlot: true,
              totalAmount: true,
              items: true,
            },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /lab-prescriptions/:id
   * Complete details of a single lab prescription/report
   */
  async getLabPrescriptionById(id: string) {
    const record = await this.prisma.labPrescription.findFirst({
      where: {
        OR: [{ id }, { labOrderId: id }],
      },
      include: {
        labOrder: {
          include: {
            items: true,
            laboratory: {
              select: { id: true, name: true, phone: true, logoUrl: true },
            },
          },
        },
        laboratory: {
          select: { id: true, name: true, phone: true, logoUrl: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Lab prescription not found with ID ${id}`);
    }

    return record;
  }
}

import {
  BadRequestException,
  ForbiddenException,
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
import { buildLabPrescriptionPdf, splitPathologist } from './lab-prescription-pdf.js';
import { decodePdfImage, loadPdfImage, uploadsPathOf, type PdfImage } from './pdf-images.js';

const UPLOAD_ROOT = join(process.cwd(), 'uploads');
const LAB_REPORTS_DIR = 'lab-reports';
const LAB_SIGNATURES_DIR = 'lab-signatures';
const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
/** Tabibistan logo printed on every report (apps/api/assets/brand) */
const BRAND_LOGO_PATH = join(process.cwd(), 'assets', 'brand', 'tabibistan-logo.png');
const TIME_ZONE = 'Asia/Karachi';

/** "PHC" -> "PHC License No." (the partner lab's healthcare licence, top-right of the report) */
const LICENSE_LABELS: Record<string, string> = {
  PHC: 'PHC License No.',
  SHC: 'SHC License No.',
  KPK_HCC: 'KP HCC License No.',
  B_HCC: 'BHCC License No.',
  FEDERAL: 'License No.',
  OTHER: 'License No.',
};

let brandLogo: Promise<PdfImage | null> | null = null;
const getBrandLogo = () => (brandLogo ??= loadPdfImage(BRAND_LOGO_PATH, 400));

const formatDateTime = (d: Date) =>
  d.toLocaleString('en-GB', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(/\b(am|pm)\b/, (m) => m.toUpperCase());

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric' });

const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return null;
  const m = phone.match(/^\+92(\d{3})(\d{7})$/);
  return m ? `+92 ${m[1]} ${m[2]}` : phone;
};

type UploadedFile = { buffer: Buffer; size: number; mimetype?: string; originalname?: string };

@Injectable()
export class LabPrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The signed-in lab (from the lab token's verified phone) */
  private async labByPhone(phone: string) {
    const lab = await this.prisma.laboratory.findUnique({ where: { phone }, select: { id: true, name: true } });
    if (!lab) throw new NotFoundException('No laboratory is registered with this phone number.');
    return lab;
  }

  /**
   * Loads the order (by id or order number) and everything printed on the
   * report; the order must belong to the signed-in lab.
   */
  private async loadReportContext(dto: CreateLabPrescriptionDto, labPhone: string) {
    const lab = await this.labByPhone(labPhone);
    const order = await this.prisma.labOrder.findFirst({
      where: { OR: [{ id: dto.labOrderId }, { orderNumber: dto.labOrderId }] },
      include: {
        items: true,
        laboratory: {
          include: { branches: { orderBy: [{ isMainCenter: 'desc' }, { createdAt: 'asc' }] } },
        },
      },
    });
    if (!order) throw new NotFoundException(`Lab order not found: ${dto.labOrderId}`);
    if (order.laboratoryId !== lab.id) throw new ForbiddenException('This order belongs to another laboratory.');
    if (order.status === 'CANCELLED') throw new BadRequestException('This order was cancelled, so a report cannot be issued for it.');

    const rows = (dto.testResults ?? [])
      .map((r) => ({
        testName: r.testName.trim(),
        parameter: (r.parameter?.trim() || r.testName).trim(),
        result: r.result.trim(),
        unit: r.unit?.trim() || undefined,
        referenceRange: r.referenceRange?.trim() || undefined,
        flag: r.flag?.trim().toUpperCase() || undefined,
      }))
      .filter((r) => r.testName && r.result);
    if (rows.length === 0) throw new BadRequestException('Add at least one test parameter with an observed value.');

    const labRow = order.laboratory;
    const main = labRow.branches.find((b) => b.isMainCenter) ?? labRow.branches[0] ?? null;

    // "Dr. Sana Malik" + "Consultant Pathologist" -> stored as "Dr. Sana Malik (Consultant Pathologist)"
    const typedName = dto.pathologistName?.trim() || main?.medicalDirectorName || '';
    const split = splitPathologist(typedName);
    const designation = dto.pathologistDesignation?.trim() || split.designation || 'Consultant Pathologist';
    const pathologistName = split.name;
    const pathologistFull = pathologistName ? `${pathologistName} (${designation})` : null;

    const sampleDate = dto.sampleCollectedAt ? new Date(dto.sampleCollectedAt) : null;
    const sampleCollected =
      sampleDate && !Number.isNaN(sampleDate.getTime())
        ? formatDateTime(sampleDate)
        : `${formatDate(order.scheduledDate)}${order.timeSlot ? `, ${order.timeSlot}` : ''}`;

    const [logo, labLogo, signature] = await Promise.all([
      getBrandLogo(),
      labRow.logoUrl ? this.imageFromUpload(labRow.logoUrl, 300) : Promise.resolve(null),
      dto.pathologistSignUrl ? this.imageFromUpload(dto.pathologistSignUrl, 700) : Promise.resolve(null),
    ]);

    return {
      order,
      rows,
      pathologistFull,
      pdf: (preview: boolean, reportRef: string | null) =>
        buildLabPrescriptionPdf({
          brandLogo: logo,
          laboratory: {
            name: labRow.name,
            address: main?.address ?? null,
            phone: formatPhone(main?.phone || labRow.phone),
            licenseLabel: LICENSE_LABELS[labRow.regulatoryBody] ?? 'License No.',
            licenseNumber: labRow.licenseNumber,
            logo: labLogo,
          },
          orderNumber: order.orderNumber,
          reportRef,
          sampleCollectedDate: sampleCollected,
          reportDate: formatDateTime(new Date()),
          patient: {
            name: dto.patientName?.trim() || order.patientName,
            age: dto.patientAge ?? order.patientAge,
            gender: dto.patientGender?.trim() || order.patientGender,
          },
          referringPathologist: main?.medicalDirectorName ?? null,
          pathologist: {
            name: pathologistName || 'Consultant Pathologist',
            designation,
            signature,
          },
          testResults: rows,
          remarks: dto.remarks?.trim() || null,
          instructions: dto.instructions?.trim() || null,
          preview,
        }),
    };
  }

  private async imageFromUpload(url: string, maxSide: number) {
    const path = uploadsPathOf(url, UPLOAD_ROOT);
    return path ? loadPdfImage(path, maxSide) : null;
  }

  /**
   * POST /lab-prescriptions/preview
   * The report exactly as it will be issued (with a PREVIEW watermark); nothing is saved.
   */
  async previewLabPrescription(dto: CreateLabPrescriptionDto, labPhone: string): Promise<Buffer> {
    const ctx = await this.loadReportContext(dto, labPhone);
    return ctx.pdf(true, null);
  }

  /**
   * POST /lab-prescriptions
   * Creates (or replaces) the order's report record, writes the PDF, sets the
   * order to REPORT_UPLOADED and notifies the patient.
   */
  async createLabPrescription(dto: CreateLabPrescriptionDto, labPhone: string) {
    const ctx = await this.loadReportContext(dto, labPhone);
    const { order, rows } = ctx;
    const existing = await this.prisma.labPrescription.findUnique({ where: { labOrderId: order.id }, select: { id: true } });
    const reportRef = (existing?.id ?? randomUUID()).slice(0, 8).toUpperCase();
    const pdfBuffer = ctx.pdf(false, reportRef);

    const reportsFolder = join(UPLOAD_ROOT, LAB_REPORTS_DIR);
    await mkdir(reportsFolder, { recursive: true });
    const safeOrderNum = order.orderNumber.replace(/[^A-Za-z0-9-]/g, '');
    const fileName = `${safeOrderNum}-${Date.now()}-${randomUUID().slice(0, 8)}.pdf`;
    await writeFile(join(reportsFolder, fileName), pdfBuffer);
    const pdfUrl = `/uploads/${LAB_REPORTS_DIR}/${fileName}`;

    const data = {
      pathologistName: ctx.pathologistFull,
      pathologistSignUrl: dto.pathologistSignUrl?.trim() || null,
      patientName: dto.patientName?.trim() || order.patientName,
      patientAge: dto.patientAge ?? order.patientAge ?? null,
      patientGender: dto.patientGender?.trim() || order.patientGender || null,
      testResults: rows as any,
      remarks: dto.remarks?.trim() || null,
      instructions: dto.instructions?.trim() || null,
      pdfUrl,
    };

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.labPrescription.upsert({
        where: { labOrderId: order.id },
        create: { labOrderId: order.id, laboratoryId: order.laboratoryId, userId: order.userId, ...data },
        update: data,
        include: {
          labOrder: {
            include: {
              items: true,
              laboratory: { select: { id: true, name: true, phone: true, logoUrl: true } },
            },
          },
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        },
      });

      await tx.labOrder.update({
        where: { id: order.id },
        data: { reportFileUrl: pdfUrl, reportUploadedAt: new Date(), status: 'REPORT_UPLOADED' },
      });

      await tx.userNotification.create({
        data: {
          userId: order.userId,
          title: existing ? 'Diagnostic Report Updated' : 'Diagnostic Report Ready',
          message: existing
            ? `Your diagnostic lab report for order #${order.orderNumber} was updated by ${order.laboratory.name}.`
            : `Your diagnostic lab report for order #${order.orderNumber} is ready to view.`,
          type: 'LAB_REPORT_READY',
          isRead: false,
        },
      });

      return record;
    });
  }

  /**
   * POST /lab-prescriptions/signature  (multipart: signature = PNG / JPG, max 2 MB)
   * -> { url } to send as pathologistSignUrl
   */
  async uploadSignature(labPhone: string, file: UploadedFile | undefined) {
    const lab = await this.labByPhone(labPhone);
    if (!file?.buffer?.length) throw new BadRequestException('Choose a signature or stamp image to upload.');
    if (file.size > SIGNATURE_MAX_BYTES) throw new BadRequestException('The signature image must be 2 MB or smaller.');
    const b = file.buffer;
    const ext = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? 'png' : b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : null;
    if (!ext) throw new BadRequestException('Upload the signature as a PNG or JPG image.');
    if (!decodePdfImage(b, 50)) {
      throw new BadRequestException('This image can’t be placed on the report. Save it as a standard PNG or JPG and try again.');
    }
    const folder = join(UPLOAD_ROOT, LAB_SIGNATURES_DIR);
    await mkdir(folder, { recursive: true });
    const fileName = `${lab.id}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    await writeFile(join(folder, fileName), b);
    return { url: `/uploads/${LAB_SIGNATURES_DIR}/${fileName}` };
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

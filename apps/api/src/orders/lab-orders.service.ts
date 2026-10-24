import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AdminLabOrderQueryDto,
  CreateLabOrderDto,
  UpdateLabOrderStatusDto,
} from './dto/create-lab-order.dto.js';

const UPLOAD_ROOT = join(process.cwd(), 'uploads');
const REPORTS_DIR = 'labs/reports';

@Injectable()
export class LabOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to generate a unique order number like ORD-2026-1042
   */
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    for (let i = 0; i < 15; i++) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      const candidate = `ORD-${year}-${suffix}`;
      const existing = await this.prisma.labOrder.findUnique({
        where: { orderNumber: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }
    // High-concurrency fallback with timestamp slice
    return `ORD-${year}-${Date.now().toString().slice(-5)}`;
  }

  /**
   * Resolve or create a valid User for the order
   */
  private async resolveUserId(dto: CreateLabOrderDto): Promise<string> {
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true },
      });
      if (user) return user.id;
    }

    // Try finding by phone
    if (dto.patientPhone) {
      const existingByPhone = await this.prisma.user.findFirst({
        where: { phone: dto.patientPhone },
        select: { id: true },
      });
      if (existingByPhone) return existingByPhone.id;

      // Create a user record for this patient
      const newUser = await this.prisma.user.create({
        data: {
          phone: dto.patientPhone,
          firstName: dto.patientName,
        },
        select: { id: true },
      });
      return newUser.id;
    }

    // Fallback: pick any user or create one
    const anyUser = await this.prisma.user.findFirst({ select: { id: true } });
    if (anyUser) return anyUser.id;

    const guestUser = await this.prisma.user.create({
      data: {
        firstName: dto.patientName || 'Guest Patient',
        phone: '+923000000000',
      },
      select: { id: true },
    });
    return guestUser.id;
  }

  /**
   * POST /orders/lab-orders
   * Public / User Order Creation
   */
  async createLabOrder(dto: CreateLabOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one test/package item is required');
    }

    // Verify laboratory exists
    const lab = await this.prisma.laboratory.findUnique({
      where: { id: dto.laboratoryId },
      select: { id: true, name: true, phone: true, hasHomeSample: true, homeSampleFee: true },
    });
    if (!lab) {
      throw new NotFoundException(`Laboratory not found with id ${dto.laboratoryId}`);
    }

    const userId = await this.resolveUserId(dto);
    const orderNumber = await this.generateOrderNumber();

    // Calculate pricing breakdown
    const subTotal = dto.items.reduce(
      (sum, item) => sum + (Number(item.price) || 0),
      0,
    );

    const isHome = (dto.collectionType || 'HOME_COLLECTION') === 'HOME_COLLECTION';
    let homeSampleFee = 0;
    if (isHome) {
      if (dto.homeSampleFee !== undefined && dto.homeSampleFee !== null) {
        homeSampleFee = Number(dto.homeSampleFee);
      } else if (lab.homeSampleFee) {
        homeSampleFee = Number(lab.homeSampleFee);
      }
    }

    const discount = Number(dto.discount) || 0;
    const totalAmount = Math.max(0, subTotal + homeSampleFee - discount);

    // Save in single Prisma transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.labOrder.create({
        data: {
          orderNumber,
          userId,
          laboratoryId: dto.laboratoryId,
          collectionType: dto.collectionType || 'HOME_COLLECTION',
          status: 'PENDING',
          paymentStatus: (dto as any).paymentStatus || 'PENDING',
          paymentMethod: dto.paymentMethod || 'CASH_ON_COLLECTION',
          subTotal,
          homeSampleFee,
          discount,
          totalAmount,
          scheduledDate: new Date(dto.scheduledDate),
          timeSlot: dto.timeSlot,
          patientName: dto.patientName,
          patientPhone: dto.patientPhone,
          patientAge: dto.patientAge ? Number(dto.patientAge) : null,
          patientGender: dto.patientGender || null,
          address: dto.address,
          city: dto.city || 'Rawalpindi/Islamabad',
          latitude: dto.latitude ? Number(dto.latitude) : null,
          longitude: dto.longitude ? Number(dto.longitude) : null,
          specialInstructions: dto.specialInstructions || null,
          items: {
            create: dto.items.map((item) => ({
              labPackageId: item.labPackageId || null,
              itemTitle: item.itemTitle,
              itemCode: item.itemCode || null,
              itemType: item.itemType || 'INDIVIDUAL_TEST',
              price: Number(item.price) || 0,
            })),
          },
        },
        include: {
          items: true,
          laboratory: {
            select: {
              id: true,
              name: true,
              phone: true,
              logoUrl: true,
            },
          },
        },
      });

      // Insert UserNotification for the patient
      await tx.userNotification.create({
        data: {
          userId: created.userId,
          title: 'Order Placed Successfully',
          message: `Your lab order #${created.orderNumber} has been placed. We will collect the sample as per your scheduled slot.`,
          type: 'LAB_ORDER_PLACED',
          isRead: false,
        },
      });

      return created;
    });

    return order;
  }

  /**
   * GET /labs/orders?userId=...
   * Retrieve orders for a specific user
   */
  async getUserLabOrders(userId: string) {
    if (!userId) return [];
    return this.prisma.labOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        laboratory: {
          select: {
            id: true,
            name: true,
            phone: true,
            logoUrl: true,
          },
        },
      },
    });
  }

  /**
   * GET /admin/lab-orders
   * Admin order list with filters, search, pagination, and KPI aggregates
   */
  async getAdminLabOrders(filters: AdminLabOrderQueryDto) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status && filters.status.toUpperCase() !== 'ALL') {
      where.status = filters.status.toUpperCase();
    }

    if (filters.paymentStatus && filters.paymentStatus.toUpperCase() !== 'ALL') {
      where.paymentStatus = filters.paymentStatus.toUpperCase();
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { patientName: { contains: q, mode: 'insensitive' } },
        { patientPhone: { contains: q, mode: 'insensitive' } },
        { laboratory: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [orders, total, totalCount, pendingSamplesCount, completedCount, revenueAggregate] =
      await Promise.all([
        this.prisma.labOrder.findMany({
          where,
          include: {
            laboratory: {
              select: {
                id: true,
                name: true,
                phone: true,
                logoUrl: true,
              },
            },
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.labOrder.count({ where }),
        this.prisma.labOrder.count(),
        this.prisma.labOrder.count({
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'SAMPLE_COLLECTION_PENDING'],
            },
          },
        }),
        this.prisma.labOrder.count({
          where: { status: 'COMPLETED' },
        }),
        this.prisma.labOrder.aggregate({
          _sum: { totalAmount: true },
          where: {
            OR: [
              { paymentStatus: 'PAID' },
              { status: 'COMPLETED' },
            ],
          },
        }),
      ]);

    const totalRevenue = revenueAggregate._sum.totalAmount || 0;

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      kpis: {
        totalOrders: totalCount,
        pendingSampleCollections: pendingSamplesCount,
        completedOrders: completedCount,
        totalRevenue,
      },
    };
  }

  /**
   * GET /admin/lab-orders/:id
   * Admin single order details
   */
  async getAdminLabOrderById(id: string) {
    const order = await this.prisma.labOrder.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        laboratory: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            logoUrl: true,
            hasHomeSample: true,
            homeSampleFee: true,
          },
        },
        items: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Lab order not found with identifier: ${id}`);
    }

    return order;
  }

  /**
   * PATCH /admin/lab-orders/:id/status
   * Admin status update
   */
  async updateAdminOrderStatus(id: string, dto: UpdateLabOrderStatusDto) {
    const order = await this.prisma.labOrder.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
    });

    if (!order) {
      throw new NotFoundException(`Lab order not found with identifier: ${id}`);
    }

    const data: any = {};
    if (dto.status) {
      data.status = dto.status as any;
    }
    if (dto.paymentStatus) {
      data.paymentStatus = dto.paymentStatus as any;
    }

    return this.prisma.labOrder.update({
      where: { id: order.id },
      data,
      include: {
        laboratory: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: true,
      },
    });
  }

  /**
   * Resolve laboratory for partner lab requests
   */
  private async resolvePartnerLab(identifier: { phone?: string; laboratoryId?: string }) {
    if (identifier.laboratoryId) {
      const lab = await this.prisma.laboratory.findUnique({
        where: { id: identifier.laboratoryId },
        select: { id: true, name: true, phone: true },
      });
      if (lab) return lab;
    }

    if (identifier.phone) {
      const clean = identifier.phone.trim();
      const noPlus = clean.replace(/^\+/, '');
      const withPlus = clean.startsWith('+') ? clean : `+${clean}`;

      const lab = await this.prisma.laboratory.findFirst({
        where: {
          OR: [{ phone: clean }, { phone: withPlus }, { phone: noPlus }],
        },
        select: { id: true, name: true, phone: true },
      });
      if (lab) return lab;
    }

    throw new NotFoundException('Partner laboratory not found for current session.');
  }

  /**
   * GET /lab/orders
   * Partner lab's assigned orders
   */
  async getPartnerLabOrders(identifier: { phone?: string; laboratoryId?: string }) {
    const lab = await this.resolvePartnerLab(identifier);

    return this.prisma.labOrder.findMany({
      where: { laboratoryId: lab.id },
      include: {
        items: true,
        laboratory: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * PATCH /lab/orders/:id/status
   * Partner lab status update
   */
  async updatePartnerLabOrderStatus(
    identifier: { phone?: string; laboratoryId?: string },
    orderId: string,
    status: string,
  ) {
    const lab = await this.resolvePartnerLab(identifier);

    const order = await this.prisma.labOrder.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    if (order.laboratoryId !== lab.id) {
      throw new ForbiddenException('This order does not belong to your laboratory.');
    }

    return this.prisma.labOrder.update({
      where: { id: order.id },
      data: { status: status as any },
      include: {
        items: true,
        laboratory: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * POST /lab/orders/:id/upload-report
   * Partner lab diagnostic report PDF upload
   */
  async uploadLabReport(
    identifier: { phone?: string; laboratoryId?: string },
    orderId: string,
    file: { originalname?: string; buffer: Buffer; mimetype?: string },
  ) {
    const lab = await this.resolvePartnerLab(identifier);

    const order = await this.prisma.labOrder.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    if (order.laboratoryId !== lab.id) {
      throw new ForbiddenException('This order does not belong to your laboratory.');
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Diagnostic report file is required.');
    }

    const folder = join(UPLOAD_ROOT, REPORTS_DIR);
    await mkdir(folder, { recursive: true });

    const ext = extname(file.originalname || '') || '.pdf';
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const fullPath = join(folder, fileName);

    await writeFile(fullPath, file.buffer);
    const reportFileUrl = `/uploads/${REPORTS_DIR}/${fileName}`;

    return this.prisma.labOrder.update({
      where: { id: order.id },
      data: {
        reportFileUrl,
        reportUploadedAt: new Date(),
        status: 'REPORT_UPLOADED',
      },
      include: {
        items: true,
        laboratory: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }
}

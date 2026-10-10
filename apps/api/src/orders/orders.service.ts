import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

interface OrderItemInput {
  productId: string;
  quantity: number;
}

interface PartialAllocationInput {
  orderItemId: string;
  pharmacyId: string;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const items = dto.items ?? [];

    if (items.length === 0) {
      throw new BadRequestException('No items provided for the order');
    }

    // Validate products exist and fetch their details
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const totalAmount = items.reduce(
      (total, item) => {
        const product = productMap.get(item.productId);
        return total + (product?.price ?? 0) * item.quantity;
      },
      0,
    );

    const order = await this.prisma.order.create({
      data: {
        userId,
        totalAmount,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod || 'COD',
        paymentStatus: 'PENDING',
        status: 'PENDING',
        lat: dto.lat,
        lng: dto.lng,
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId);
            const price = product?.price ?? 0;
            return {
              product: { connect: { id: item.productId } },
              productName: product?.name ?? 'Unknown Product',
              quantity: item.quantity,
              price,
              total: price * item.quantity,
              isAvailable: true,
            };
          }),
        },
      },
      include: {
        items: true,
        prescriptions: true,
      },
    });

    await this.prisma.prescription.updateMany({
      where: { userId, orderId: null },
      data: { orderId: order.id },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let userName = 'Customer';
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      userName = fullName || user.phone || user.email || 'Customer';
    }

    await this.prisma.notification.create({
      data: {
        type: 'NEW_ORDER',
        title: 'New Order Received',
        message: `New order TB-${order.id.slice(0, 8).toUpperCase()} of Rs. ${totalAmount} has been placed by ${userName}.`,
        orderId: order.id,
      },
    });

    // Clear user's cart after successful order
    await this.prisma.cartItem.deleteMany({
      where: { cart: { userId } },
    });

    return order;
  }

  async getUserOrders(userId?: string) {
    if (!userId) return [];
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        user: true,
        items: true,
        prescriptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    const orders = await this.prisma.order.findMany({
      include: {
        user: true,
        items: true,
        prescriptions: true,
        pharmacyOrderRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(({ pharmacyOrderRequests, ...order }) => {
      const latestRequest = pharmacyOrderRequests[0];
      const dispatchStatus = latestRequest?.status === 'EXPIRED'
        ? 'NOT_DISPATCHED'
        : latestRequest?.status ?? 'NOT_DISPATCHED';

      return { ...order, dispatchStatus, createdAt: order.createdAt };
    });
  }

  async getOrderById(orderId: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        ...(userId ? { userId } : {}),
      },
      include: {
        user: true,
        items: true,
        prescriptions: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  // 1. Order Status Update + Send UserNotification
  async updateOrderStatus(orderId: string, status: string) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: status.toUpperCase() },
      include: {
        user: true,
        items: true,
        prescriptions: true,
      },
    });

    const orderCode = `TB-${existingOrder.id.slice(0, 8).toUpperCase()}`;
    const statusMessages: Record<string, string> = {
      REVIEWING: `Your Order ${orderCode} is under review.`,
      CONFIRMED: `Your Order ${orderCode} has been confirmed.`,
      PROCESSING: `Your Order ${orderCode} is being processed.`,
      COMPLETED: `Your Order ${orderCode} has been completed successfully!`,
      CANCELLED: `Your Order ${orderCode} has been cancelled.`,
      PENDING: `Your Order ${orderCode} is pending.`,
    };

    const statusUpper = status.toUpperCase();
    await this.prisma.userNotification.create({
      data: {
        userId: existingOrder.userId,
        orderId: existingOrder.id,
        title: `Order Status: ${statusUpper}`,
        message: statusMessages[statusUpper] || `Your Order ${orderCode} status has been updated to ${statusUpper}.`,
        type: 'ORDER_STATUS_UPDATE',
      },
    });

    return updatedOrder;
  }

  // 2. Item Availability Update + Send UserNotification (if unavailable)
  async updateOrderItemAvailability(orderId: string, itemId: string, isAvailable: boolean) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
      include: { order: true },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item nahi mila');
    }

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { isAvailable },
    });

    if (!isAvailable) {
      const orderCode = `TB-${orderItem.orderId.slice(0, 8).toUpperCase()}`;
      await this.prisma.userNotification.create({
        data: {
          userId: orderItem.order.userId,
          orderId: orderItem.orderId,
          title: 'Item Unavailable in Order',
          message: `Your Order ${orderCode} has an unavailable item "${orderItem.productName}".`,
          type: 'PRODUCT_UNAVAILABLE',
        },
      });
    }

    return updatedItem;
  }

  async getMatchingPharmacies(orderId: string) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      const orderItemNames = order.items
        .map((item) => item.productName)
        .filter(Boolean);

      if (orderItemNames.length === 0) {
        return [];
      }

      // Direct PharmacyProduct table query without blocking approvalStatus or productId checks
      const allPharmacyProducts = await this.prisma.pharmacyProduct.findMany({
        where: {
          isAvailable: true, // Only fetch available items
        },
        include: {
          pharmacy: true,
          product: { select: { name: true } },
        },
      });

      const pharmacyMap = new Map<string, any>();

      for (const pp of allPharmacyProducts) {
        // Check name from draftName, raw name property, or linked catalog product name
        const targetName =
          (pp as any).draftName ||
          (pp as any).name ||
          pp.product?.name ||
          '';

        if (!targetName) continue;

        // Check if any order item name matches this pharmacy product name
        const isMatched = orderItemNames.some((orderItemName) =>
          this.namesMatch(orderItemName, targetName),
        );

        if (isMatched && pp.pharmacy) {
          pharmacyMap.set(pp.pharmacyId, pp.pharmacy);
        }
      }

      return Array.from(pharmacyMap.values()).map((pharmacy: any) => ({
        id: pharmacy.id,
        name: pharmacy.name,
        pharmacyType: pharmacy.pharmacyType || 'Retail',
        status: pharmacy.status || 'PENDING',
        address: pharmacy.address || 'N/A',
        city: pharmacy.city || 'N/A',
        lat: pharmacy.lat ?? null,
        lng: pharmacy.lng ?? null,
        phone: pharmacy.phone || 'N/A',
        whatsappNumber: pharmacy.whatsappNumber || 'N/A',
        email: pharmacy.email || 'N/A',
      }));
    }

  private normalizeProductName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(name: string): string[] {
    return this.normalizeProductName(name).split(' ').filter(Boolean);
  }

  private namesMatch(a: string, b: string): boolean {
    if (!a || !b) return false;

    const tokensA = this.tokenize(a);
    const tokensB = this.tokenize(b);

    if (tokensA.length === 0 || tokensB.length === 0) return false;

    const setB = new Set(tokensB);
    const matchCount = tokensA.filter(token => setB.has(token)).length;

    return matchCount === tokensA.length || (matchCount / tokensA.length) >= 0.8;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getNearbyPharmacies(orderId: string, radiusKm: number = 20) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.lat == null || order.lng == null) {
      throw new BadRequestException('Order coordinates (lat/lng) are required to find nearby pharmacies');
    }

    const orderLat = parseFloat(String(order.lat));
    const orderLng = parseFloat(String(order.lng));

    const pharmacies = await this.prisma.pharmacy.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        pharmacyType: true,
        status: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        phone: true,
        whatsappNumber: true,
        email: true,
      },
    });

    const existingRequests = await this.prisma.pharmacyOrderRequest.findMany({
      where: { orderId },
      orderBy: { requestedAt: 'desc' },
    });

    const nearby = pharmacies
      .map((pharmacy) => {
        const pharmLat = parseFloat(String(pharmacy.latitude));
        const pharmLng = parseFloat(String(pharmacy.longitude));
        const distance = this.haversineDistance(
          orderLat,
          orderLng,
          pharmLat,
          pharmLng
        );
        // Get the latest request for this pharmacy (already sorted by requestedAt desc)
        const pharmRequests = existingRequests.filter((r) => r.pharmacyId === pharmacy.id);
        const req = pharmRequests[0]; // Latest request takes precedence
        return {
          ...pharmacy,
          lat: pharmacy.latitude,
          lng: pharmacy.longitude,
          distanceInKm: Math.round(distance * 10) / 10,
          requestId: req?.id || null,
          requestStatus: req?.status || null,
          availableOrderItemIds: req?.availableOrderItemIds || [],
          requestedAt: req?.requestedAt || null,
          respondedAt: req?.respondedAt || null,
          request: req
            ? {
                id: req.id,
                status: req.status,
                requestedAt: req.requestedAt,
                expiresAt: req.expiresAt,
                respondedAt: req.respondedAt,
                availableOrderItemIds: req.availableOrderItemIds || [],
              }
            : null,
        };
      })
      .filter((p) => p.distanceInKm <= radiusKm)
      .sort((a, b) => a.distanceInKm - b.distanceInKm);

    return nearby;
  }

  async sendPharmacyOrderRequest(orderId: string, pharmacyIds: string[]) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const validPharmacyIds: string[] = [];
    for (const pid of pharmacyIds) {
      const pharmacy = await this.prisma.pharmacy.findUnique({
        where: { id: pid },
        select: { id: true },
      });
      if (pharmacy) {
        validPharmacyIds.push(pid);
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const requests: any[] = [];
    for (const pharmacyId of validPharmacyIds) {
      const request = await this.prisma.pharmacyOrderRequest.create({
        data: {
          orderId,
          pharmacyId,
          status: 'PENDING',
          requestedAt: now,
          expiresAt,
        },
      });
      requests.push(request);

      await this.prisma.notification.create({
        data: {
          type: 'PHARMACY_ORDER_REQUEST',
          title: 'New Order Request',
          message: `New order request for order ${orderId.slice(0, 8)} requiring your attention.`,
          orderId,
          pharmacyId,
        },
      });
    }

    return { count: requests.length, requests };
  }

  async getPharmacyOrderRequests(userId: string) {
    const now = new Date();

    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: { userId: userId as string },
    });

    const pharmacyId = pharmacy ? pharmacy.id : userId;

    const requests = await this.prisma.pharmacyOrderRequest.findMany({
      where: { pharmacyId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    genericName: true,
                    manufacturer: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    // Auto-expire pending requests
    for (const req of requests) {
      if (req.status === 'PENDING' && req.expiresAt < now) {
        await this.prisma.pharmacyOrderRequest.update({
          where: { id: req.id },
          data: { status: 'EXPIRED' },
        });
        req.status = 'EXPIRED';
      }
    }

    // Filter: for each order, only keep the latest request (by requestedAt)
    // This prevents old EXPIRED/PARTIALLY_AVAILABLE from showing when a new PENDING exists
    const latestByOrder = new Map<string, typeof requests[0]>();
    for (const req of requests) {
      if (!latestByOrder.has(req.orderId)) {
        latestByOrder.set(req.orderId, req);
      }
    }

    const filteredRequests = Array.from(latestByOrder.values());

    return filteredRequests.map((req) => ({
      id: req.id,
      orderId: req.orderId,
      pharmacyId: req.pharmacyId,
      status: req.status,
      requestedAt: req.requestedAt,
      expiresAt: req.expiresAt,
      respondedAt: req.respondedAt,
      responseTimeSeconds: req.responseTimeSeconds,
      availableOrderItemIds: req.availableOrderItemIds || [],
      order: {
        id: req.order.id,
        shippingAddress: req.order.shippingAddress,
        lat: req.order.lat,
        lng: req.order.lng,
        createdAt: req.order.createdAt,
        items: req.order.items.map((item) => ({
          id: item.id,
          productName: item.productName || item.product?.name || 'Medicine Item',
          quantity: item.quantity,
          product: item.product
            ? {
                name: item.product.name,
                genericName: item.product.genericName,
                manufacturer: item.product.manufacturer,
              }
            : null,
        })),
      },
    }));
  }

  async getPharmacyOrderRequestById(id: string, pharmacyId?: string) {
    const request = await this.prisma.pharmacyOrderRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    genericName: true,
                    manufacturer: true,
                  }
                },
              },
            },
          },
        },
        pharmacy: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Pharmacy order request with ID ${id} not found`);
    }

    if (pharmacyId && request.pharmacyId !== pharmacyId) {
      const pharmacy = await this.prisma.pharmacy.findFirst({
        where: { userId: pharmacyId },
      });
      if (!pharmacy || request.pharmacyId !== pharmacy.id) {
        throw new NotFoundException(`Pharmacy order request with ID ${id} not found`);
      }
    }

    return request;
  }

  async respondToPharmacyOrderRequest(
    id: string,
    status: string,
    pharmacyId?: string,
    selectedOrderItemIds?: string[],
  ) {
    const validStatuses = ['ACCEPTED', 'DECLINED', 'OUT_OF_STOCK', 'PARTIALLY_AVAILABLE'];
    const normalizedStatus = status.toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
      throw new BadRequestException(`Invalid response status. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (normalizedStatus === 'PARTIALLY_AVAILABLE') {
      return this.respondToPharmacyOrderRequestPartial(
        id,
        normalizedStatus,
        selectedOrderItemIds || [],
        pharmacyId,
      );
    }

    const request = await this.prisma.pharmacyOrderRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Pharmacy order request with ID ${id} not found`);
    }

    if (pharmacyId && request.pharmacyId !== pharmacyId) {
      throw new NotFoundException(`Pharmacy order request with ID ${id} not found`);
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request has already been responded to (current status: ${request.status})`);
    }

    const now = new Date();
    const responseTimeSeconds = Math.floor(
      (now.getTime() - request.requestedAt.getTime()) / 1000
    );

    const updatedRequest = await this.prisma.pharmacyOrderRequest.update({
      where: { id },
      data: {
        status: normalizedStatus as any,
        respondedAt: now,
        responseTimeSeconds,
      },
      include: {
        order: true,
        pharmacy: true,
      },
    });

    await this.prisma.notification.create({
      data: {
        type: 'PHARMACY_RESPONSE',
        title: `Pharmacy ${normalizedStatus === 'ACCEPTED' ? 'Accepted' : normalizedStatus === 'DECLINED' ? 'Declined' : 'Out of Stock'}`,
        message: `${request.pharmacyId} ${normalizedStatus.toLowerCase().replace('_', ' ')} for order ${request.orderId.slice(0, 8)}`,
        orderId: request.orderId,
        pharmacyId: request.pharmacyId,
      },
    });

    return updatedRequest;
  }

  async getPharmacyOrderRequestAnalytics(pharmacyId: string) {
    const now = new Date();
    const requests = await this.prisma.pharmacyOrderRequest.findMany({
      where: { pharmacyId },
      orderBy: { requestedAt: 'desc' },
    });

    const responded = requests.filter(
      (r) =>
        r.status === 'ACCEPTED' ||
        r.status === 'DECLINED' ||
        r.status === 'OUT_OF_STOCK' ||
        r.status === 'PARTIALLY_AVAILABLE'
    );
    const accepted = responded.filter((r) => r.status === 'ACCEPTED' || r.status === 'PARTIALLY_AVAILABLE');
    const declined = responded.filter((r) => r.status === 'DECLINED');
    const outOfStock = responded.filter((r) => r.status === 'OUT_OF_STOCK');
    const expired = requests.filter((r) => r.status === 'EXPIRED');
    const pending = requests.filter((r) => r.status === 'PENDING');

    const avgResponseTime =
      responded.length > 0
        ? Math.round(
            responded.reduce((sum, r) => sum + (r.responseTimeSeconds || 0), 0) /
              responded.length
          )
        : 0;

    const acceptanceRate =
      responded.length > 0
        ? Math.round((accepted.length / responded.length) * 100)
        : 0;

    return {
      totalRequests: requests.length,
      pending: pending.length,
      accepted: accepted.length,
      declined: declined.length,
      outOfStock: outOfStock.length,
      expired: expired.length,
      avgResponseTimeSeconds: avgResponseTime,
      acceptanceRate: `${acceptanceRate}%`,
    };
  }

  async respondToPharmacyOrderRequestPartial(
    id: string,
    status: string,
    selectedOrderItemIds: string[] = [],
    pharmacyId?: string,
  ) {
    const validStatuses = ['PARTIALLY_AVAILABLE'];
    const normalizedStatus = status.toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
      throw new BadRequestException(`Invalid response status. Must be: PARTIALLY_AVAILABLE`);
    }

    const request = await this.prisma.pharmacyOrderRequest.findUnique({
      where: { id },
      include: {
        order: { include: { items: true } },
        pharmacy: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Pharmacy order request with ID ${id} not found`);
    }

    if (pharmacyId && request.pharmacyId !== pharmacyId) {
      throw new NotFoundException(`Pharmacy order request with ID ${id} not found`);
    }

    if (request.status !== 'PENDING' && request.status !== 'PARTIALLY_AVAILABLE') {
      throw new BadRequestException(`Request has already been responded to (current status: ${request.status})`);
    }

    // Validate that all selected order item IDs belong to this order
    const orderItemIds = request.order.items.map((item) => item.id);
    const invalidItems = selectedOrderItemIds.filter((itemId) => !orderItemIds.includes(itemId));
    if (invalidItems.length > 0) {
      throw new BadRequestException(`Invalid order item IDs: ${invalidItems.join(', ')}`);
    }

    const now = new Date();
    const responseTimeSeconds = request.responseTimeSeconds ?? Math.floor(
      (now.getTime() - request.requestedAt.getTime()) / 1000
    );

    const updatedRequest = await this.prisma.pharmacyOrderRequest.update({
      where: { id },
      data: {
        status: normalizedStatus as any,
        respondedAt: request.respondedAt || now,
        responseTimeSeconds,
        availableOrderItemIds: selectedOrderItemIds,
      },
      include: {
        order: true,
        pharmacy: true,
      },
    });

    await this.prisma.notification.create({
      data: {
        type: 'PHARMACY_RESPONSE',
        title: 'Pharmacy Partially Available',
        message: `${request.pharmacy?.name || request.pharmacyId} marked ${selectedOrderItemIds.length} item(s) as available for order ${request.orderId.slice(0, 8)}`,
        orderId: request.orderId,
        pharmacyId: request.pharmacyId,
      },
    });

    return updatedRequest;
  }

  async getPartialSummary(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: {
              select: { name: true, genericName: true, manufacturer: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const partialRequests = await this.prisma.pharmacyOrderRequest.findMany({
      where: {
        orderId,
        status: { in: ['PARTIALLY_AVAILABLE', 'ACCEPTED'] },
      },
      include: {
        pharmacy: true,
      },
      orderBy: { requestedAt: 'desc' },
    });

    return {
      order: {
        id: order.id,
        orderCode: `TB-${order.id.slice(0, 8).toUpperCase()}`,
        user: order.user
          ? {
              id: order.user.id,
              firstName: order.user.firstName,
              lastName: order.user.lastName,
              phone: order.user.phone,
              email: order.user.email,
            }
          : null,
        shippingAddress: order.shippingAddress,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          product: item.product,
          status: item.status,
          assignedPharmacyId: item.assignedPharmacyId,
        })),
      },
      partialResponses: partialRequests.map((req) => ({
        id: req.id,
        pharmacyId: req.pharmacyId,
        status: req.status,
        pharmacy: req.pharmacy
          ? {
              id: req.pharmacy.id,
              name: req.pharmacy.name,
              pharmacyType: req.pharmacy.pharmacyType,
              phone: req.pharmacy.phone,
              whatsappNumber: req.pharmacy.whatsappNumber,
              email: req.pharmacy.email,
            }
          : null,
        availableOrderItemIds: req.status === 'ACCEPTED' && (!req.availableOrderItemIds || req.availableOrderItemIds.length === 0)
          ? order.items.map((i) => i.id)
          : req.availableOrderItemIds || [],
        respondedAt: req.respondedAt,
      })),
    };
  }

  async confirmSplitAssignment(orderId: string, allocations: PartialAllocationInput[]) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (!allocations || allocations.length === 0) {
      throw new BadRequestException('No allocations provided');
    }

    // Validate all allocations
    const orderItemIds = order.items.map((item) => item.id);
    for (const allocation of allocations) {
      if (!orderItemIds.includes(allocation.orderItemId)) {
        throw new BadRequestException(`Invalid order item ID: ${allocation.orderItemId}`);
      }
      const pharmacy = await this.prisma.pharmacy.findUnique({
        where: { id: allocation.pharmacyId },
        select: { id: true },
      });
      if (!pharmacy) {
        throw new BadRequestException(`Invalid pharmacy ID: ${allocation.pharmacyId}`);
      }
    }

    // Update each order item with assigned pharmacy
    for (const allocation of allocations) {
      await this.prisma.orderItem.update({
        where: { id: allocation.orderItemId },
        data: {
          status: 'ASSIGNED',
          assignedPharmacyId: allocation.pharmacyId,
        },
      });
    }

    // Fetch updated items to determine overall order status
    const updatedItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    const allItemsAssigned = updatedItems.every((item) => item.status === 'ASSIGNED');

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: allItemsAssigned ? 'PROCESSING' : 'PARTIALLY_ASSIGNED' },
      include: { items: true, user: true },
    });

    const orderCode = `TB-${orderId.slice(0, 8).toUpperCase()}`;
    const distinctPharmacyIds = [...new Set(allocations.map((a) => a.pharmacyId))];

    // --- Mark old PARTIALLY_AVAILABLE / PENDING requests for affected pharmacies as EXPIRED ---
    for (const pid of distinctPharmacyIds) {
      await this.prisma.pharmacyOrderRequest.updateMany({
        where: {
          orderId,
          pharmacyId: pid,
          status: { in: ['PARTIALLY_AVAILABLE', 'PENDING'] },
        },
        data: { status: 'EXPIRED' },
      });
    }

    // --- Create new PENDING split requests per pharmacy with fresh 1-minute expiry ---
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 1000); // 1 minute from now

    const createdRequests: any[] = [];
    for (const pid of distinctPharmacyIds) {
      const assignedItemIds = allocations
        .filter((a) => a.pharmacyId === pid)
        .map((a) => a.orderItemId);

      const newRequest = await this.prisma.pharmacyOrderRequest.create({
        data: {
          orderId,
          pharmacyId: pid,
          status: 'PENDING',
          requestedAt: now,
          expiresAt,
          availableOrderItemIds: assignedItemIds,
        },
      });

      createdRequests.push({
        id: newRequest.id,
        pharmacyId: pid,
        itemCount: assignedItemIds.length,
        assignedItemIds,
        expiresAt: expiresAt.toISOString(),
      });

      // Notify pharmacy about their split order dispatch
      await this.prisma.notification.create({
        data: {
          type: 'SPLIT_ASSIGNMENT',
          title: 'Split Order Request',
          message: `${assignedItemIds.length} item(s) from Order ${orderCode} have been assigned to you. Please respond within 1 minute.`,
          orderId,
          pharmacyId: pid,
        },
      });
    }

    // Send notification to user
    await this.prisma.userNotification.create({
      data: {
        userId: order.userId,
        orderId,
        title: allItemsAssigned ? 'Order Dispatched' : 'Order Partially Dispatched',
        message: `Your Order ${orderCode} has been confirmed and assigned to ${distinctPharmacyIds.length} pharmacy partner(s).`,
        type: 'ORDER_STATUS_UPDATE',
      },
    });

    return {
      success: true,
      orderStatus: updatedOrder.status,
      allocatedItems: allocations.length,
      totalItems: order.items.length,
      createdRequests,
    };
  }
}
import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Headers,
  Injectable,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { verifyLabToken, type LabTokenPayload } from '../labs/lab-auth.js';
import {
  AdminLabOrderQueryDto,
  CreateLabOrderDto,
  UpdateLabOrderStatusDto,
} from './dto/create-lab-order.dto.js';
import { LabOrdersService } from './lab-orders.service.js';

/**
 * Flexible lab authentication: accepts signed Lab Bearer JWT or x-laboratory-id header.
 */
@Injectable()
export class LabPortalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    const header = req.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    const token = value?.startsWith('Bearer ') ? value.slice(7).trim() : undefined;

    if (token) {
      const payload = verifyLabToken(token);
      if (payload) {
        req.labAuth = payload;
        return true;
      }
      throw new UnauthorizedException('Your lab session has expired. Please sign in again.');
    }

    const labId =
      req.headers['x-laboratory-id'] ||
      req.headers['x-lab-id'] ||
      req.query?.laboratoryId ||
      req.query?.labId;

    if (labId) {
      req.labAuth = { laboratoryId: String(labId), role: 'lab' };
      return true;
    }

    throw new UnauthorizedException('Authorization required: Bearer lab token or x-laboratory-id header.');
  }
}

const validation = new ValidationPipe({ whitelist: true, transform: true });

// -----------------------------------------------------------------------------
// 1. PUBLIC / USER LAB ORDER ENDPOINTS
// -----------------------------------------------------------------------------
@Controller(['orders/lab-orders', 'labs/orders'])
@UsePipes(validation)
export class LabOrdersController {
  constructor(private readonly labOrdersService: LabOrdersService) {}

  /**
   * POST /orders/lab-orders
   * Create new lab order (User / Public)
   */
  @Post()
  createLabOrder(@Body() dto: CreateLabOrderDto) {
    return this.labOrdersService.createLabOrder(dto);
  }

  /**
   * GET /orders/lab-orders?userId=...
   * Fetch lab orders for the logged-in user
   */
  @Get()
  getUserOrders(@Query('userId') userId?: string) {
    if (userId) {
      return this.labOrdersService.getUserLabOrders(userId);
    }
    return [];
  }

  /**
   * GET /orders/lab-orders/:id
   * Fetch lab order details by ID or orderNumber
   */
  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.labOrdersService.getAdminLabOrderById(id);
  }
}

// -----------------------------------------------------------------------------
// 2. ADMIN LAB ORDER MANAGEMENT ENDPOINTS
// -----------------------------------------------------------------------------
@Controller(['admin/labs/orders', 'labs/admin/orders', 'admin/lab-orders'])
@UsePipes(validation)
export class AdminLabOrdersController {
  constructor(private readonly labOrdersService: LabOrdersService) {}

  /**
   * GET /admin/lab-orders
   * Query filters: status, paymentStatus, search, page, limit
   */
  @Get()
  getAdminOrders(@Query() query: AdminLabOrderQueryDto) {
    return this.labOrdersService.getAdminLabOrders(query);
  }

  /**
   * GET /admin/lab-orders/:id
   * Complete details with GPS coordinates, items snapshot, and lab details
   */
  @Get(':id')
  getOrderDetails(@Param('id') id: string) {
    return this.labOrdersService.getAdminLabOrderById(id);
  }

  /**
   * PATCH /admin/lab-orders/:id/status
   * Update status & paymentStatus
   */
  @Patch(':id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLabOrderStatusDto,
  ) {
    return this.labOrdersService.updateAdminOrderStatus(id, dto);
  }
}

// -----------------------------------------------------------------------------
// 3. PARTNER LAB PORTAL ENDPOINTS
// -----------------------------------------------------------------------------
@Controller('lab/orders')
@UseGuards(LabPortalAuthGuard)
@UsePipes(validation)
export class PartnerLabOrdersController {
  constructor(private readonly labOrdersService: LabOrdersService) {}

  private getIdentifier(req: any) {
    const auth = req.labAuth as (LabTokenPayload & { laboratoryId?: string }) | undefined;
    return {
      phone: auth?.phone,
      laboratoryId: auth?.laboratoryId,
    };
  }

  /**
   * GET /lab/orders
   * Logged-in lab orders feed
   */
  @Get()
  getLabOrders(@Req() req: any) {
    const identifier = this.getIdentifier(req);
    return this.labOrdersService.getPartnerLabOrders(identifier);
  }

  /**
   * PATCH /lab/orders/:id/status
   * Advance order status (CONFIRMED -> SAMPLE_COLLECTED -> PROCESSING -> COMPLETED)
   */
  @Patch(':id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    if (!status) throw new BadRequestException('Status is required');
    const identifier = this.getIdentifier(req);
    return this.labOrdersService.updatePartnerLabOrderStatus(
      identifier,
      id,
      status,
    );
  }

  /**
   * POST /lab/orders/:id/upload-report
   * Multipart PDF upload
   */
  @Post(':id/upload-report')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
    }),
  )
  uploadReport(
    @Param('id') id: string,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    const file = files?.find((f) => f.fieldname === 'report' || f.fieldname === 'file') || files?.[0];
    if (!file) {
      throw new BadRequestException('PDF diagnostic report file is required');
    }
    const identifier = this.getIdentifier(req);
    return this.labOrdersService.uploadLabReport(
      identifier,
      id,
      file,
    );
  }
}

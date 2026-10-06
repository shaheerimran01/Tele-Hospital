import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PharmacyProductsService } from './pharmacy-products.service.js';
import {
  AdminPharmacyProductQueryDto,
  SyncToCatalogDto,
} from './dto/admin-pharmacy-product.dto.js';

/**
 * Admin endpoints for reviewing seller uploads. Nothing here is reachable from the seller
 * portal - the global Product catalog only changes through "sync".
 */
@Controller('admin/pharmacy-products')
export class PharmacyProductsAdminController {
  constructor(private readonly pharmacyProductsService: PharmacyProductsService) {}

  // GET /admin/pharmacy-products?pharmacyId=&type=all|unique|similar&search=&limit=&offset=
  @Get()
  list(@Query() query: AdminPharmacyProductQueryDto) {
    return this.pharmacyProductsService.getAdminPharmacyProducts(query);
  }

  // POST /admin/pharmacy-products/sync  -> push offers into the global Product catalog
  @Post('sync')
  sync(@Body() body: SyncToCatalogDto) {
    return this.pharmacyProductsService.syncToGlobalProductCatalog(body);
  }
}
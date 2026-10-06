import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PharmacyProductsService } from './pharmacy-products.service.js';
import {
  AdoptOfferDto,
  PublishOfferDto,
  SetPublicationDto,
} from './dto/admin-pharmacy-product.dto.js';

/**
 * Admin-only publication workflow. Nothing in here is reachable from the seller portal:
 * a PharmacyProduct stays a local draft until an admin either publishes it or adopts it
 * into an existing catalog item.
 */
@Controller('admin/global-catalog')
export class PharmacyProductsCatalogController {
  constructor(private readonly pharmacyProductsService: PharmacyProductsService) {}

  // GET /admin/global-catalog?status=all|published|unpublished&search=&limit=&offset=
  @Get()
  list(
    @Query()
    query: {
      search?: string;
      status?: string;
      limit?: string | number;
      offset?: string | number;
    },
  ) {
    return this.pharmacyProductsService.getGlobalCatalog(query);
  }

  // POST /admin/global-catalog/:productId/adopt  -> link an uploaded offer to this item
  @Post(':productId/adopt')
  adopt(@Param('productId') productId: string, @Body() body: AdoptOfferDto) {
    return this.pharmacyProductsService.adoptOfferIntoProduct(productId, body?.pharmacyProductId);
  }

  // PATCH /admin/global-catalog/:productId/publication  -> publish / unpublish
  @Patch(':productId/publication')
  setPublication(@Param('productId') productId: string, @Body() body: SetPublicationDto) {
    return this.pharmacyProductsService.setProductPublication(productId, body?.isActive !== false);
  }

  // DELETE /admin/global-catalog/:productId
  @Delete(':productId')
  remove(@Param('productId') productId: string) {
    return this.pharmacyProductsService.deleteCatalogProduct(productId);
  }

  // POST /admin/global-catalog/publish-offer  -> publish one uploaded offer
  @Post('publish-offer')
  publishOffer(@Body() body: PublishOfferDto) {
    return this.pharmacyProductsService.publishOffer({
      pharmacyProductId: body?.pharmacyProductId,
      forceCreateNew: body?.forceCreateNew,
    });
  }
}
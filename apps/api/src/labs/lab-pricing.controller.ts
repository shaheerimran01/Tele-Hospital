import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { LabPricingQueryDto, UpdateLabPriceDto } from './dto/lab-pricing.dto.js';
import { LabPricingService } from './lab-pricing.service.js';

@Controller('lab-pricing')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LabPricingController {
  constructor(private readonly pricing: LabPricingService) {}

  /**
   * GET /lab-pricing/items?laboratoryId=<uuid>
   * -> { laboratory, summary, groups, items[] } : every master catalog item with
   *    this lab's price override, availability and switched-off sub-tests.
   */
  @Get('items')
  list(@Query() query: LabPricingQueryDto) {
    return this.pricing.listItems(query.laboratoryId);
  }

  /**
   * PATCH /lab-pricing/items/:labPackageId
   * body: { laboratoryId, customBasePrice?, customDiscountPrice?, isAvailable?, disabledSubTests? }
   * Upserts the lab's LabPackagePrice row; returns the updated item.
   */
  @Patch('items/:labPackageId')
  update(@Param('labPackageId', new ParseUUIDPipe()) labPackageId: string, @Body() dto: UpdateLabPriceDto) {
    return this.pricing.updateItem(labPackageId, dto);
  }
}

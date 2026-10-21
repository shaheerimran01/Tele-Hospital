import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentLab, LabAuthGuard, type LabTokenPayload } from './lab-auth.js';
import { LabPricingQueryDto, UpdateLabPriceDto } from './dto/lab-pricing.dto.js';
import { LabPricingService } from './lab-pricing.service.js';

@Controller('lab-pricing')
@UseGuards(LabAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LabPricingController {
  constructor(private readonly pricing: LabPricingService) {}

  /**
   * Both routes need Authorization: Bearer <lab_token>; a lab can only see and edit its own prices.
   *
   * GET /lab-pricing/items?laboratoryId=<uuid>
   * -> { laboratory, summary, groups, items[] } : every master catalog item with
   *    this lab's price override, availability and switched-off sub-tests.
   */
  @Get('items')
  list(@CurrentLab() lab: LabTokenPayload, @Query() query: LabPricingQueryDto) {
    return this.pricing.listItems(query.laboratoryId, lab.phone);
  }

  /**
   * PATCH /lab-pricing/items/:labPackageId
   * body: { laboratoryId, customBasePrice?, customDiscountPrice?, isAvailable?, disabledSubTests? }
   * Upserts the lab's LabPackagePrice row; returns the updated item.
   */
  @Patch('items/:labPackageId')
  update(@CurrentLab() lab: LabTokenPayload, @Param('labPackageId', new ParseUUIDPipe()) labPackageId: string, @Body() dto: UpdateLabPriceDto) {
    return this.pricing.updateItem(labPackageId, dto, lab.phone);
  }
}

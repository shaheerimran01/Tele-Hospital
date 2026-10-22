import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { LabsForTestQueryDto } from './dto/patient-labs.dto.js';
import { PatientLabsService } from './patient-labs.service.js';

/** Public endpoints for patients choosing a diagnostic lab */
@Controller('patient')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PatientLabsController {
  constructor(private readonly patientLabs: PatientLabsService) {}

  /**
   * GET /patient/labs-for-test?labPackageId=<uuid>&userLat=31.52&userLng=74.35
   * -> { success, item, sortedBy: 'distance' | 'price', data: [{ laboratoryId, labName, logoUrl,
   *      offeredPrice, originalPrice, discountPercent, hasHomeSample, homeSampleFee,
   *      unavailableTests, nearestBranch: { id, name, address, distanceKm }, branches }] }
   * Only APPROVED, verified labs with an active branch that have not switched the item off.
   */
  @Get('labs-for-test')
  labsForTest(@Query() query: LabsForTestQueryDto) {
    return this.patientLabs.labsForTest(query);
  }
}

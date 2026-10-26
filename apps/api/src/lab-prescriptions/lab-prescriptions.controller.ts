import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  CreateLabPrescriptionDto,
  LabPrescriptionQueryDto,
} from './dto/create-lab-prescription.dto.js';
import { LabPrescriptionsService } from './lab-prescriptions.service.js';

const validation = new ValidationPipe({ whitelist: true, transform: true });

@Controller('lab-prescriptions')
@UsePipes(validation)
export class LabPrescriptionsController {
  constructor(private readonly labPrescriptionsService: LabPrescriptionsService) {}

  /**
   * POST /lab-prescriptions
   * Create a new lab prescription / diagnostic report and generate PDF
   */
  @Post()
  createLabPrescription(@Body() dto: CreateLabPrescriptionDto) {
    return this.labPrescriptionsService.createLabPrescription(dto);
  }

  /**
   * GET /lab-prescriptions/lab/:laboratoryId
   * Fetch all lab prescriptions/reports for a specific laboratory
   */
  @Get('lab/:laboratoryId')
  getLabPrescriptionsByLab(
    @Param('laboratoryId') laboratoryId: string,
    @Query() query: LabPrescriptionQueryDto,
  ) {
    return this.labPrescriptionsService.getLabPrescriptionsByLab(laboratoryId, query);
  }

  /**
   * GET /lab-prescriptions/:id
   * Fetch complete details of a single lab prescription/report
   */
  @Get(':id')
  getLabPrescriptionById(@Param('id') id: string) {
    return this.labPrescriptionsService.getLabPrescriptionById(id);
  }
}

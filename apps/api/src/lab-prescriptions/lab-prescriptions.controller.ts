import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentLab, LabAuthGuard, type LabTokenPayload } from '../labs/lab-auth.js';
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
   * POST /lab-prescriptions   (Authorization: Bearer <lab_token>)
   * Issue the diagnostic report: saves the results, generates the Tabibistan
   * PDF, sets the order to REPORT_UPLOADED and notifies the patient.
   */
  @Post()
  @UseGuards(LabAuthGuard)
  createLabPrescription(@CurrentLab() lab: LabTokenPayload, @Body() dto: CreateLabPrescriptionDto) {
    return this.labPrescriptionsService.createLabPrescription(dto, lab.phone);
  }

  /**
   * POST /lab-prescriptions/preview   (Authorization: Bearer <lab_token>)
   * Same body as POST /lab-prescriptions -> application/pdf with a PREVIEW
   * watermark. Nothing is saved.
   */
  @Post('preview')
  @HttpCode(200)
  @UseGuards(LabAuthGuard)
  async previewLabPrescription(@CurrentLab() lab: LabTokenPayload, @Body() dto: CreateLabPrescriptionDto) {
    const pdf = await this.labPrescriptionsService.previewLabPrescription(dto, lab.phone);
    return new StreamableFile(pdf, { type: 'application/pdf', disposition: 'inline; filename="report-preview.pdf"' });
  }

  /**
   * POST /lab-prescriptions/signature   (multipart: signature = PNG / JPG, max 2 MB)
   * -> { url } for pathologistSignUrl
   */
  @Post('signature')
  @UseGuards(LabAuthGuard)
  @UseInterceptors(FileInterceptor('signature', { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  uploadSignature(@CurrentLab() lab: LabTokenPayload, @UploadedFile() file: { buffer: Buffer; size: number; mimetype?: string }) {
    return this.labPrescriptionsService.uploadSignature(lab.phone, file);
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

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RegisterLabDto } from './dto/register-lab.dto.js';
import { LICENSE_MAX_BYTES, LabsService, type LabUploadFiles } from './labs.service.js';
import { CurrentLab, LabAuthGuard, type LabTokenPayload } from './lab-auth.js';

/**
 * Files stay in memory until the form passes validation and the duplicate
 * check, so rejected requests leave nothing on disk. Type and per-file size
 * are checked in LabsService (by file content); this is the hard upper limit.
 */
const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: LICENSE_MAX_BYTES, files: 2, fields: 20 },
};

@Controller('labs')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }))
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Get('admin/labs/dashboard-stats')
  getDashboardStats() {
    return this.labsService.getDashboardStats();
  }

  @Get('admin/labs/catalog-exclusions')
  getCatalogExclusions() {
    return this.labsService.getCatalogExclusions();
  }

  @Get('admin/labs/verification-list')
  getVerificationList(@Query('status') status?: string) {
    return this.labsService.getVerificationList(status);
  }

  @Patch('admin/labs/update-status/:id')
  updateLabStatus(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' | 'PENDING'; rejectionReason?: string },
  ) {
    return this.labsService.updateLabStatus(id, body);
  }

  @Patch('admin/labs/:id/document-verification')
  updateDocumentVerification(@Param('id') id: string, @Body() body: { documentVerified: boolean }) {
    return this.labsService.updateDocumentVerification(id, body.documentVerified);
  }

  /**
   * PATCH /labs/admin/labs/:id/issue   body: { message, status?: 'PENDING' | 'REJECTED' }
   * Sends a verification issue to the lab: sets the status (PENDING by default),
   * documentVerified = false and rejectionReason = message.
   */
  @Patch('admin/labs/:id/issue')
  sendLabIssue(@Param('id') id: string, @Body() body: { message?: string; status?: 'PENDING' | 'REJECTED' }) {
    return this.labsService.sendLabIssue(id, body ?? {});
  }

  /**
   * POST /labs/register  (multipart/form-data, Authorization: Bearer <lab_token> from /labs/auth/verify-otp)
   *   name, email, phone (primary login phone, must be the verified one),
   *   whatsappNumber? (+923001234567), licenseNumber,
   *   regulatoryBody (PHC | SHC | KPK_HCC | B_HCC | FEDERAL | OTHER),
   *   branches (JSON array: name, isMainCenter?, medicalDirectorName,
   *             medicalCouncilLicenseNo, address, phone?, latitude?, longitude?),
   *   logo (optional PNG/JPG, max 2 MB), licenseDoc (required PNG/JPG/PDF, max 10 MB)
   * -> 201 laboratory with branches (verificationStatus PENDING, isVerified false)
   * -> 400 validation errors, 401 not signed in, 409 phone, email or license number already registered
   */
  @Post('register')
  @UseGuards(LabAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'licenseDoc', maxCount: 1 },
      ],
      uploadOptions,
    ),
  )
  register(@CurrentLab() auth: LabTokenPayload, @Body() dto: RegisterLabDto, @UploadedFiles() files: LabUploadFiles) {
    return this.labsService.registerLaboratory(dto, files ?? {}, auth.phone);
  }

  @Get('admin/labs/details/:id')
    getLabDetails(@Param('id') id: string) {
      return this.labsService.getLabDetails(id);
    }

  @Get('admin/labs/catalog-exclusions/:id')
  getCatalogExclusionDetails(@Param('id') id: string) {
    return this.labsService.getCatalogExclusionDetails(id);
  }

  @Patch('admin/labs/catalog-exclusions/:id/tests')
  updateMasterPackageTests(@Param('id') id: string, @Body() body: { testsIncluded: string[] }) {
    return this.labsService.updateMasterPackageTests(id, body.testsIncluded);
  }

  @Delete('admin/labs/catalog-exclusions/:id')
  deleteMasterPackage(@Param('id') id: string) {
    return this.labsService.deleteMasterPackage(id);
  }
}


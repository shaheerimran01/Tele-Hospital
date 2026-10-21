import { Body, Controller, Post, UploadedFiles, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RegisterLabDto } from './dto/register-lab.dto.js';
import { LICENSE_MAX_BYTES, LabsService, type LabUploadFiles } from './labs.service.js';

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

  /**
   * POST /labs/register   (multipart/form-data)
   *   name, email, whatsappNumber (+923001234567), licenseNumber,
   *   regulatoryBody (PHC | SHC | KPK_HCC | B_HCC | FEDERAL | OTHER),
   *   branches (JSON array: name, isMainCenter?, medicalDirectorName,
   *             medicalCouncilLicenseNo, address, latitude?, longitude?),
   *   logo (optional PNG/JPG, max 2 MB), licenseDoc (required PNG/JPG/PDF, max 10 MB)
   * -> 201 laboratory with branches (verificationStatus PENDING, isVerified false)
   * -> 400 validation errors, 409 email or license number already registered
   */
  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'licenseDoc', maxCount: 1 },
      ],
      uploadOptions,
    ),
  )
  register(@Body() dto: RegisterLabDto, @UploadedFiles() files: LabUploadFiles) {
    return this.labsService.registerLaboratory(dto, files ?? {});
  }
}

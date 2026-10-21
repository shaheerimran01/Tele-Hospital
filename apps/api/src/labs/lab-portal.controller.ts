import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SendLabOtpDto, UpdateBranchDto, UpdateLabDocumentsDto, UpdateLabProfileDto, VerifyLabOtpDto } from './dto/lab-portal.dto.js';
import { CurrentLab, LabAuthGuard, type LabTokenPayload } from './lab-auth.js';
import { LabAuthService } from './lab-auth.service.js';
import { LabPortalService } from './lab-portal.service.js';
import { LICENSE_MAX_BYTES, type LabUploadFiles } from './labs.service.js';

const validation = new ValidationPipe({ whitelist: true, transform: true });

/** Phone + OTP sign-in for labs */
@Controller('labs/auth')
@UsePipes(validation)
export class LabAuthController {
  constructor(private readonly auth: LabAuthService) {}

  // POST /labs/auth/send-otp   body: { phone }   (OTP printed in the API terminal in development)
  @Post('send-otp')
  @HttpCode(200)
  sendOtp(@Body() dto: SendLabOtpDto) {
    return this.auth.sendOtp(dto);
  }

  // POST /labs/auth/verify-otp   body: { phone, otp } -> { token, registered, laboratory }
  @Post('verify-otp')
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyLabOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  // GET /labs/auth/me   (Authorization: Bearer <lab_token>)
  @Get('me')
  @UseGuards(LabAuthGuard)
  me(@CurrentLab() lab: LabTokenPayload) {
    return this.auth.me(lab.phone);
  }
}

/** The signed-in lab's own dashboard data (Authorization: Bearer <lab_token>) */
@Controller('labs/me')
@UseGuards(LabAuthGuard)
@UsePipes(validation)
export class LabPortalController {
  constructor(private readonly portal: LabPortalService) {}

  // GET /labs/me/overview -> profile, branches, stats, admin review issues
  @Get('overview')
  overview(@CurrentLab() lab: LabTokenPayload) {
    return this.portal.overview(lab.phone);
  }

  // PATCH /labs/me/profile   body: { name?, email?, whatsappNumber?, hasHomeSample?, homeSampleFee? }
  @Patch('profile')
  updateProfile(@CurrentLab() lab: LabTokenPayload, @Body() dto: UpdateLabProfileDto) {
    return this.portal.updateProfile(lab.phone, dto);
  }

  // POST /labs/me/documents   multipart: licenseDoc?, logo?, licenseNumber?, regulatoryBody?
  @Post('documents')
  @HttpCode(200)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'licenseDoc', maxCount: 1 },
      ],
      { storage: memoryStorage(), limits: { fileSize: LICENSE_MAX_BYTES, files: 2, fields: 10 } },
    ),
  )
  updateDocuments(@CurrentLab() lab: LabTokenPayload, @Body() dto: UpdateLabDocumentsDto, @UploadedFiles() files: LabUploadFiles) {
    return this.portal.updateDocuments(lab.phone, dto, files ?? {});
  }

  // PATCH /labs/me/branches/:branchId   body: { name?, medicalDirectorName?, medicalCouncilLicenseNo?, address?, phone? }
  @Patch('branches/:branchId')
  updateBranch(@CurrentLab() lab: LabTokenPayload, @Param('branchId', new ParseUUIDPipe()) branchId: string, @Body() dto: UpdateBranchDto) {
    return this.portal.updateBranch(lab.phone, branchId, dto);
  }

  // POST /labs/me/resubmit -> back to PENDING review after fixing the admin's notes
  @Post('resubmit')
  @HttpCode(200)
  resubmit(@CurrentLab() lab: LabTokenPayload) {
    return this.portal.resubmit(lab.phone);
  }
}

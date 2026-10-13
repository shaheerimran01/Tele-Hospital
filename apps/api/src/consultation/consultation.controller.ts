import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { ConsultationService } from './consultation.service.js';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto.js';
import { CreateIntakeDto } from './dto/create-intake.dto.js';
import { GetSpecialitiesDto } from './dto/get-specialities.dto.js';

type RequestWithUser = Request & { user?: { id?: string } };

const ALLOWED_ATTACHMENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
  // Voice notes recorded in the browser (Chrome/Edge/Firefox: webm or ogg, Safari: mp4)
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
];

/** "audio/webm;codecs=opus" -> "audio/webm" */
const baseMimeType = (mime: string) => mime.split(';')[0].trim().toLowerCase();

const attachmentUploadOptions = {
  storage: diskStorage({
    destination: './uploads/consultations',
    filename: (_req, file, callback) => {
      const uniqueName =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
        extname(file.originalname);
      callback(null, uniqueName);
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, callback: any) => {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(baseMimeType(file.mimetype))) {
      return callback(
        new BadRequestException('Only PNG, JPG, WEBP, PDF or audio voice notes are allowed'),
        false,
      );
    }
    callback(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
};

@Controller('consultation')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  // GET /consultation/specialities?search=&category=
  @Get('specialities')
  getSpecialities(@Query() query: GetSpecialitiesDto) {
    return this.consultationService.getSpecialities(query);
  }

  // GET /consultation/family-members
  @Get('family-members')
  getFamilyMembers(@Req() req: RequestWithUser) {
    return this.consultationService.getFamilyMembers(this.getUserId(req));
  }

  // POST /consultation/family-members
  @Post('family-members')
  createFamilyMember(
    @Req() req: RequestWithUser,
    @Body() dto: CreateFamilyMemberDto,
  ) {
    return this.consultationService.createFamilyMember(
      this.getUserId(req),
      dto,
    );
  }

  // POST /consultation/intake
  @Post('intake')
  createIntake(@Req() req: RequestWithUser, @Body() dto: CreateIntakeDto) {
    return this.consultationService.createIntake(this.getUserId(req), dto);
  }

  // GET /consultation/intake/:id  (used by the next "options" step)
  @Get('intake/:id')
  getIntake(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.consultationService.getIntake(this.getUserId(req), id);
  }

  // POST /consultation/attachments  (multipart, field name: "file")
  @Post('attachments')
  @UseInterceptors(FileInterceptor('file', attachmentUploadOptions))
  uploadAttachment(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.getUserId(req);
    if (!file) throw new BadRequestException('File is required');
    return this.consultationService.buildAttachmentResponse(file);
  }

  /**
   * Resolves the logged-in user's id.
   * Uses `req.user.id` when an auth guard has populated it; until the API has
   * a guard, falls back to the `userId` query param (same convention as the
   * cart, orders and addresses endpoints) or an `x-user-id` header.
   */
  private getUserId(req: RequestWithUser): string {
    const fromQuery = req.query?.userId;
    const fromHeader = req.headers['x-user-id'];
    const userId =
      req.user?.id ||
      (typeof fromQuery === 'string' ? fromQuery : undefined) ||
      (typeof fromHeader === 'string' ? fromHeader : undefined);

    if (!userId) {
      throw new BadRequestException('Please log in to continue (userId missing)');
    }
    return userId;
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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

import { DoctorsService } from './doctors.service.js';
import { RegisterDoctorDto } from './dto/register-doctor.dto.js';
import { GetDoctorsQueryDto } from './dto/get-doctors-query.dto.js';
import { UpdateDoctorStatusDto } from './dto/update-doctor-status.dto.js';

type RequestWithUser = Request & { user?: { id?: string } };

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const imageUploadOptions = {
  storage: diskStorage({
    destination: './uploads/doctors',
    filename: (_req, file, callback) => {
      const uniqueName =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
        extname(file.originalname).toLowerCase();
      callback(null, uniqueName);
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, callback: any) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException('Only JPG, PNG or WEBP images are allowed'),
        false,
      );
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};

@Controller('doctors')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  // POST /doctors/register  ("Join Now")
  // Works without login. When the doctor is logged in (req.user, or ?userId= like
  // the rest of this API), the profile is linked to that user account.
  @Post('register')
  register(@Req() req: RequestWithUser, @Body() dto: RegisterDoctorDto) {
    const fromQuery = req.query?.userId;
    const userId =
      req.user?.id || (typeof fromQuery === 'string' && fromQuery ? fromQuery : undefined);
    return this.doctorsService.register(dto, userId);
  }

  // POST /doctors/uploads  (multipart, field "file")
  // Used by the Join Now form for the PMDC certificate and profile photo.
  // Returns { fileUrl } to send back in pmdcCertificateUrl / profilePhotoUrl.
  @Post('uploads')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');
    return {
      fileName: file.originalname,
      fileUrl: `/uploads/doctors/${file.filename}`,
      fileType: file.mimetype,
      fileSize: file.size,
    };
  }

  // GET /doctors?speciality=&status=&search=&city=&lat=&lng=&radiusKm=&consultationType=&page=&limit=
  @Get()
  findAll(@Query() query: GetDoctorsQueryDto) {
    return this.doctorsService.findAll(query);
  }

  // GET /doctors/:id
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.doctorsService.findOne(id);
  }

  // PATCH /doctors/:id/status   body: { status: 'APPROVED' | 'REJECTED' }
  // Admin only. NOTE: the API has no admin guard yet - add one before going live.
  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDoctorStatusDto,
  ) {
    return this.doctorsService.updateStatus(id, dto);
  }
}

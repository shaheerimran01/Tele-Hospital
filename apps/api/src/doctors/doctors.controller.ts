import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { DoctorsService } from './doctors.service.js';
import { RegisterDoctorDto } from './dto/register-doctor.dto.js';
import { GetDoctorsQueryDto } from './dto/get-doctors-query.dto.js';
import { UpdateDoctorStatusDto } from './dto/update-doctor-status.dto.js';
import { SendDoctorOtpDto, VerifyDoctorOtpDto } from './dto/auth-doctor.dto.js';
import { GetNearbyDoctorsDto } from './dto/get-nearby-doctors.dto.js';
import { CurrentDoctor, DoctorAuthGuard, type DoctorTokenPayload } from './doctor-auth.js';

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

  // ---------------------------------------------------------------------------
  // Doctor auth (separate from patient accounts). Declared before ':id' routes.
  // ---------------------------------------------------------------------------

  // POST /doctors/auth/send-otp   body: { phone }
  @Post('auth/send-otp')
  @HttpCode(200)
  sendOtp(@Body() dto: SendDoctorOtpDto) {
    return this.doctorsService.sendOtp(dto);
  }

  // POST /doctors/auth/verify-otp   body: { phone, otp }
  // -> { token, isFormFilled, doctorRegistration }
  @Post('auth/verify-otp')
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyDoctorOtpDto) {
    return this.doctorsService.verifyOtp(dto);
  }

  // GET /doctors/auth/me   (Authorization: Bearer <doctor_token>)
  @Get('auth/me')
  @UseGuards(DoctorAuthGuard)
  me(@CurrentDoctor() auth: DoctorTokenPayload) {
    return this.doctorsService.getMe(auth);
  }

  // POST /doctors/register  ("Join Now" form, requires doctor token)
  @Post('register')
  @UseGuards(DoctorAuthGuard)
  register(@CurrentDoctor() auth: DoctorTokenPayload, @Body() dto: RegisterDoctorDto) {
    return this.doctorsService.register(dto, auth);
  }

  // POST /doctors/uploads  (multipart, field "file", requires doctor token)
  // Used by the Join Now form for the PMDC certificate and profile photo.
  @Post('uploads')
  @UseGuards(DoctorAuthGuard)
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

  // ---------------------------------------------------------------------------
  // Public listing / admin
  // ---------------------------------------------------------------------------

  // GET /doctors?speciality=&status=&search=&city=&lat=&lng=&radiusKm=&consultationType=&page=&limit=
  @Get()
  findAll(@Query() query: GetDoctorsQueryDto) {
    return this.doctorsService.findAll(query);
  }

  // GET /doctors/nearby?intakeId=&userId=&specialityId=&lat=&lng=&serviceMode=&radiusKm=&limit=
  // Approved doctors sorted by distance from the patient (nearest clinic first).
  @Get('nearby')
  findNearby(@Query() query: GetNearbyDoctorsDto) {
    return this.doctorsService.findNearby(query);
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

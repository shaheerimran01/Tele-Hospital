import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Patch, 
  Query,
  UseInterceptors, 
  UploadedFiles 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PharmaciesService } from './pharmacies.service.js';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto.js';

// Multer Storage Configuration for uploaded documents
const storage = diskStorage({
  destination: './uploads/pharmacies',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('pharmacies')
export class PharmaciesController {
  constructor(private readonly pharmaciesService: PharmaciesService) {}

  // POST /pharmacies/register (Full Form Submission)
  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'drugLicensePhoto', maxCount: 1 },
        { name: 'cnicFrontPhoto', maxCount: 1 },
        { name: 'cnicBackPhoto', maxCount: 1 },
      ],
      { storage },
    ),
  )
  async registerPharmacy(
    @Body() createPharmacyDto: CreatePharmacyDto,
    @UploadedFiles() files?: {
      logo?: Express.Multer.File[];
      drugLicensePhoto?: Express.Multer.File[];
      cnicFrontPhoto?: Express.Multer.File[];
      cnicBackPhoto?: Express.Multer.File[];
    },
  ) {
    const uploadedFilePaths = {
      logoUrl: files?.logo?.[0] ? `/uploads/pharmacies/${files.logo[0].filename}` : undefined,
      drugLicensePhotoUrl: files?.drugLicensePhoto?.[0] ? `/uploads/pharmacies/${files.drugLicensePhoto[0].filename}` : undefined,
      cnicFrontPhotoUrl: files?.cnicFrontPhoto?.[0] ? `/uploads/pharmacies/${files.cnicFrontPhoto[0].filename}` : undefined,
      cnicBackPhotoUrl: files?.cnicBackPhoto?.[0] ? `/uploads/pharmacies/${files.cnicBackPhoto[0].filename}` : undefined,
    };

    return this.pharmaciesService.create(createPharmacyDto, uploadedFilePaths);
  }

  // POST /pharmacies/auth/send-otp
  @Post('auth/send-otp')
  async sendPharmacyOtp(@Body('phone') phone: string) {
    return this.pharmaciesService.sendPharmacyOtp(phone);
  }

  // POST /pharmacies/auth/verify-otp
  @Post('auth/verify-otp')
  async verifyPharmacyOtp(
    @Body('phone') phone: string,
    @Body('otp') otp: string,
  ) {
    return this.pharmaciesService.verifyPharmacyOtp(phone, otp);
  }

  // POST /pharmacies/auth/init (Step 3: Save email for new user)
  @Post('auth/init')
  async initRegistration(
    @Body('phone') phone: string,
    @Body('email') email?: string,
  ) {
    return this.pharmaciesService.initRegistration(phone, email);
  }

  // GET /pharmacies (Admin list)
  @Get()
  async findAll() {
    return this.pharmaciesService.findAll();
  }

  // GET /pharmacies/:id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pharmaciesService.findOne(id);
  }

  // PATCH /pharmacies/:id/status
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'PENDING',
    @Body('isActive') isActive?: boolean,
  ) {
    return this.pharmaciesService.updateStatus(id, status, isActive);
  }
}
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { PrescriptionsService } from './prescriptions.service.js';

const multerOptions = {
  storage: diskStorage({
    destination: './uploads/prescriptions',
    filename: (req, file, callback) => {
      const uniqueName =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
        extname(file.originalname);

      callback(null, uniqueName);
    },
  }),

  fileFilter: (req: any, file: Express.Multer.File, callback: any) => {
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/pdf',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Only PNG, JPG, JPEG and PDF files are allowed',
        ),
        false,
      );
    }

    callback(null, true);
  },

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  uploadPrescription(
    @Query('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!userId) throw new BadRequestException('userId is required');
    if (!file) throw new BadRequestException('Prescription file is required');

    return this.prescriptionsService.createPrescription(userId, file);
  }

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  analyzePrescription(
    @Query('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!userId) throw new BadRequestException('userId is required');
    if (!file) throw new BadRequestException('Prescription file is required');

    return this.prescriptionsService.analyzePrescription(userId, file);
  }

  // 👈 NAYA ENDPOINT: Stored prescription ko ID se analyze karne ke liye
  @Post(':id/analyze')
  analyzeExistingPrescription(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) throw new BadRequestException('userId is required');

    return this.prescriptionsService.analyzeExistingPrescription(id, userId);
  }

  @Get()
  getUserPrescriptions(
    @Query('userId') userId: string,
    @Query('unattached') unattached?: string,
  ) {
    if (!userId) throw new BadRequestException('userId is required');

    return this.prescriptionsService.getUserPrescriptions(
      userId,
      unattached === 'true',
    );
  }

  @Get(':id')
  getPrescription(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) throw new BadRequestException('userId is required');

    return this.prescriptionsService.getPrescription(id, userId);
  }

  @Delete(':id')
  deletePrescription(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) throw new BadRequestException('userId is required');

    return this.prescriptionsService.deletePrescription(id, userId);
  }
}
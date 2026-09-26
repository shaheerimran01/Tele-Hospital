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

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/prescriptions',
        filename: (req, file, callback) => {
          const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
            extname(file.originalname);

          callback(null, uniqueName);
        },
      }),

      fileFilter: (req, file, callback) => {
        const allowedTypes = [
          'image/png',
          'image/jpeg',
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
    }),
  )
  uploadPrescription(
    @Query('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (!file) {
      throw new BadRequestException('Prescription file is required');
    }

    return this.prescriptionsService.createPrescription(
      userId,
      file,
    );
  }

  // 👈 Query query parameter 'unattached' extract karke service ko bhej rahay hain
  @Get()
  getUserPrescriptions(
    @Query('userId') userId: string,
    @Query('unattached') unattached?: string,
  ) {
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
    return this.prescriptionsService.getPrescription(
      id,
      userId,
    );
  }

  @Delete(':id')
  deletePrescription(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.prescriptionsService.deletePrescription(
      id,
      userId,
    );
  }
}
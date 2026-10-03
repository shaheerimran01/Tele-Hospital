import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PharmacyProductsService } from './pharmacy-products.service.js';

@Controller('pharmacy-products')
export class PharmacyProductsController {
  constructor(private readonly pharmacyProductsService: PharmacyProductsService) {}

  @Post(':pharmacyId/upload-csv')
  @UseInterceptors(FileInterceptor('productsCsv'))
  async uploadProductsCsv(
    @Param('pharmacyId') pharmacyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Please attach a valid CSV file in "productsCsv" field.');
    }

    if (!file.originalname.match(/\.(csv)$/i)) {
      throw new BadRequestException('Only .csv files are supported.');
    }

    return this.pharmacyProductsService.processProductsCsv(pharmacyId, file.buffer);
  }
}
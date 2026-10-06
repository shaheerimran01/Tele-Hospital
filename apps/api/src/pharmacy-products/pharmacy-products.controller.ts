import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PharmacyProductsService } from './pharmacy-products.service.js';
import { CreatePharmacyProductDto } from './dto/create-pharmacy-product.dto.js';
import { UpdatePharmacyProductDto } from './dto/update-pharmacy-product.dto.js';

type CsvUpload = {
  file?: Express.Multer.File[];
  productsCsv?: Express.Multer.File[];
};

@Controller('pharmacy-products')
export class PharmacyProductsController {
  constructor(private readonly pharmacyProductsService: PharmacyProductsService) {}

  // 1. GET products
  @Get(':pharmacyId')
  async getPharmacyProducts(@Param('pharmacyId') pharmacyId: string) {
    return this.pharmacyProductsService.getProductsByPharmacy(pharmacyId);
  }

  // 2. POST single product
  @Post(':pharmacyId/products')
  async createProduct(
    @Param('pharmacyId') pharmacyId: string,
    @Body() body: CreatePharmacyProductDto,
  ) {
    return this.pharmacyProductsService.createPharmacyProduct(pharmacyId, body);
  }

  // 3. PUT edit product
  @Put(':pharmacyId/product/:productId')
  async updateProduct(
    @Param('pharmacyId') pharmacyId: string,
    @Param('productId') productId: string,
    @Body() body: UpdatePharmacyProductDto,
  ) {
    return this.pharmacyProductsService.updatePharmacyProduct(pharmacyId, productId, body);
  }

  // 4. DELETE product
  @Delete(':pharmacyId/product/:productId')
  async deleteProduct(
    @Param('pharmacyId') pharmacyId: string,
    @Param('productId') productId: string,
  ) {
    return this.pharmacyProductsService.deletePharmacyProduct(pharmacyId, productId);
  }

  // 5. POST CSV upload - multipart/form-data, field name: "file"
  @Post('upload-csv/:pharmacyId')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'productsCsv', maxCount: 1 },
    ]),
  )
  async uploadProductsCsv(
    @Param('pharmacyId') pharmacyId: string,
    @UploadedFiles() files?: CsvUpload,
  ) {
    const file = this.resolveCsvFile(files);
    return this.pharmacyProductsService.processProductsCsv(pharmacyId, file.buffer);
  }

  // 5b. Legacy alias kept for older portal builds: /pharmacy-products/:pharmacyId/upload-csv
  @Post(':pharmacyId/upload-csv')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'productsCsv', maxCount: 1 },
    ]),
  )
  async uploadProductsCsvLegacy(
    @Param('pharmacyId') pharmacyId: string,
    @UploadedFiles() files?: CsvUpload,
  ) {
    const file = this.resolveCsvFile(files);
    return this.pharmacyProductsService.processProductsCsv(pharmacyId, file.buffer);
  }

  private resolveCsvFile(files?: CsvUpload): Express.Multer.File {
    const file = files?.file?.[0] ?? files?.productsCsv?.[0];

    if (!file) {
      throw new BadRequestException('Please attach a valid CSV file in the "file" field.');
    }
    if (!file.originalname || !/\.csv$/i.test(file.originalname)) {
      throw new BadRequestException('Only .csv files are supported.');
    }
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded CSV file is empty.');
    }

    return file;
  }
}
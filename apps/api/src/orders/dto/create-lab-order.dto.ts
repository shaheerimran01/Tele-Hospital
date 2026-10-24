import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class LabOrderItemInputDto {
  @IsOptional()
  @IsString()
  labPackageId?: string;

  @IsString()
  itemTitle: string;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsOptional()
  @IsString()
  itemType?: string; // PACKAGE | INDIVIDUAL_TEST

  @IsNumber()
  price: number;
}

export class CreateLabOrderDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  laboratoryId: string;

  @IsOptional()
  @IsString()
  collectionType?: 'HOME_COLLECTION' | 'LAB_WALK_IN';

  @IsString()
  scheduledDate: string; // ISO date string e.g. "2026-10-25"

  @IsString()
  timeSlot: string; // e.g. "08:00 AM - 10:00 AM"

  @IsString()
  patientName: string;

  @IsString()
  patientPhone: string;

  @IsOptional()
  @IsNumber()
  patientAge?: number;

  @IsOptional()
  @IsString()
  patientGender?: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  homeSampleFee?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabOrderItemInputDto)
  items: LabOrderItemInputDto[];
}

export class UpdateLabOrderStatusDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;
}

export class AdminLabOrderQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

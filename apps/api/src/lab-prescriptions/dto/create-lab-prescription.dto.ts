import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TestResultParameterDto {
  @IsNotEmpty()
  @IsString()
  testName!: string;

  @IsNotEmpty()
  @IsString()
  parameter!: string;

  @IsNotEmpty()
  @IsString()
  result!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  referenceRange?: string;

  @IsOptional()
  @IsString()
  flag?: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | string;
}

export class CreateLabPrescriptionDto {
  @IsNotEmpty()
  @IsString()
  labOrderId!: string;

  @IsNotEmpty()
  @IsString()
  laboratoryId!: string;

  @IsNotEmpty()
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  pathologistName?: string;

  @IsOptional()
  @IsString()
  pathologistSignUrl?: string;

  @IsNotEmpty()
  @IsString()
  patientName!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  patientAge?: number;

  @IsOptional()
  @IsString()
  patientGender?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestResultParameterDto)
  testResults!: TestResultParameterDto[];

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class LabPrescriptionQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

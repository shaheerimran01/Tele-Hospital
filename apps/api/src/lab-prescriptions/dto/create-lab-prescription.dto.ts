import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TestResultParameterDto {
  /** Test / panel, e.g. "Complete Blood Count (CBC)" */
  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  testName!: string;

  /** Investigation within the test, e.g. "Hemoglobin (Hb)" (defaults to the test name) */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  parameter?: string;

  /** Observed value */
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  result!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  /** Biological reference interval, e.g. "13.5 - 17.5" */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  referenceRange?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  flag?: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | string;
}

export class CreateLabPrescriptionDto {
  /** LabOrder id or order number */
  @IsNotEmpty()
  @IsString()
  labOrderId!: string;

  /** Taken from the order; accepted for older clients */
  @IsOptional()
  @IsString()
  laboratoryId?: string;

  /** Taken from the order; accepted for older clients */
  @IsOptional()
  @IsString()
  userId?: string;

  /** "Dr. Sana Malik" or "Dr. Sana Malik (Consultant Pathologist)" */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  pathologistName?: string;

  /** e.g. "Consultant Pathologist, FCPS" (stored with the name in brackets) */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  pathologistDesignation?: string;

  /** "/uploads/lab-signatures/..." from POST /lab-prescriptions/signature */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  pathologistSignUrl?: string;

  /** When the sample was collected (ISO date-time); defaults to the order's collection slot */
  @IsOptional()
  @IsDateString()
  sampleCollectedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  patientName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(130)
  patientAge?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  patientGender?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TestResultParameterDto)
  testResults!: TestResultParameterDto[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  remarks?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
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

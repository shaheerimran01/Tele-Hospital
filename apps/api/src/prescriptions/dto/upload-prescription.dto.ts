import { IsOptional, IsString } from 'class-validator';

export class UploadPrescriptionDto {
  @IsOptional()
  @IsString()
  description?: string;
}
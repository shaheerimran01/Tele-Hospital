import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PatientType } from '../../generated/prisma/enums.js';

const trimStringArray = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value
        .filter((v) => typeof v === 'string')
        .map((v: string) => v.trim())
        .filter(Boolean)
    : value;

export class CreateIntakeDto {
  @IsIn(Object.values(PatientType), {
    message: `patientType must be one of: ${Object.values(PatientType).join(', ')}`,
  })
  patientType: PatientType;

  // Required only when the consultation is for a family member
  @ValidateIf((o: CreateIntakeDto) => o.patientType === PatientType.FAMILY_MEMBER)
  @IsString()
  @IsNotEmpty({ message: 'familyMemberId is required for a family member' })
  familyMemberId?: string;

  @IsString()
  @IsNotEmpty({ message: 'specialityId is required' })
  specialityId: string;

  @Transform(trimStringArray)
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one symptom' })
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  symptoms: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  symptomDuration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Transform(trimStringArray)
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  attachments?: string[];
}

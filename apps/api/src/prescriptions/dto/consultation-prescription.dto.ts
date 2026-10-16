import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

export const PRESCRIPTION_GENDERS = ['Male', 'Female', 'Other'] as const;
export const MAX_MEDICINES = 30;
export const MAX_LAB_TESTS = 20;

/** One medicine row (checked field by field in the service) */
export interface MedicineInput {
  name?: unknown;
  dosage?: unknown;
  frequency?: unknown;
  duration?: unknown;
  instructions?: unknown;
}

/** POST /doctors/me/prescriptions: create or update the prescription for one appointment */
export class SaveConsultationPrescriptionDto {
  @IsUUID('all', { message: 'Choose the appointment this prescription is for' })
  appointmentId: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(4000, { message: 'The diagnosis can be up to 4000 characters' })
  diagnosis?: string;

  @IsArray({ message: 'medicines must be a list' })
  @ArrayMaxSize(MAX_MEDICINES, { message: `You can add up to ${MAX_MEDICINES} medicines` })
  medicines: MedicineInput[];

  @IsOptional()
  @IsArray({ message: 'labTests must be a list' })
  @ArrayMaxSize(MAX_LAB_TESTS, { message: `You can add up to ${MAX_LAB_TESTS} lab tests` })
  @IsString({ each: true, message: 'Each lab test must be text' })
  @MaxLength(120, { each: true, message: 'Each lab test can be up to 120 characters' })
  labTests?: string[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(4000, { message: 'The advice can be up to 4000 characters' })
  advice?: string;

  /** Printed on the PDF (not stored separately) */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20, { message: 'Age can be up to 20 characters' })
  patientAge?: string;

  @IsOptional()
  @Transform(trim)
  @IsIn(PRESCRIPTION_GENDERS, { message: 'Gender must be Male, Female or Other' })
  patientGender?: (typeof PRESCRIPTION_GENDERS)[number];
}

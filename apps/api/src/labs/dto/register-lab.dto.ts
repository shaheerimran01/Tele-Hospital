import { BadRequestException } from '@nestjs/common';
import { Transform, Type, plainToInstance } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RegulatoryBody } from '../../generated/prisma/enums.js';
import { CreateBranchDto } from './create-branch.dto.js';

export const MAX_BRANCHES = 20;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * `branches` arrives as a JSON string in multipart form data (or as an array in a
 * JSON body). Either way it becomes CreateBranchDto instances so @ValidateNested runs.
 */
const toBranches = ({ value }: { value: unknown }) => {
  let list = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch {
      throw new BadRequestException('branches must be a valid JSON array.');
    }
  }
  return Array.isArray(list) ? list.map((b) => plainToInstance(CreateBranchDto, b ?? {})) : list;
};

export class RegisterLabDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Lab name is required.' })
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  @MaxLength(254)
  email!: string;

  /** Primary login phone (verified by OTP). Must match the signed-in lab session. */
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s\-()]/g, '') : value))
  @IsString()
  @IsNotEmpty({ message: 'Primary phone number is required.' })
  @Matches(/^(\+92|0)?3\d{9}$/, { message: 'Primary phone must be a Pakistani mobile number, e.g. +923001234567.' })
  phone!: string;

  /** Contact WhatsApp for patient inquiries (optional), international format e.g. +923001234567 */
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s\-()]/g, '') || undefined : value))
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'WhatsApp number must be in international format, e.g. +923001234567.' })
  whatsappNumber?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty({ message: 'Healthcare license number is required.' })
  @Matches(/^[A-Z0-9][A-Z0-9\-/. ]{1,38}[A-Z0-9]$/, {
    message: 'License number must be 3 to 40 letters, numbers, dashes or slashes.',
  })
  licenseNumber!: string;

  @IsEnum(RegulatoryBody, { message: `regulatoryBody must be one of: ${Object.values(RegulatoryBody).join(', ')}.` })
  @IsNotEmpty()
  regulatoryBody!: RegulatoryBody;

  /** Home sample collection offered; multipart sends "true" / "false" (default: true) */
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value === '' ? undefined : value))
  @IsOptional()
  @IsBoolean({ message: 'hasHomeSample must be true or false.' })
  hasHomeSample?: boolean;

  /** Home collection fee in PKR (0 = free); ignored when hasHomeSample is false */
  @Type(() => Number)
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
    const raw = obj[key];
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) return undefined;
    return typeof raw === 'number' ? raw : Number(String(raw).trim());
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Home collection fee must be a number.' })
  @Min(0, { message: 'Home collection fee cannot be negative.' })
  @Max(100000, { message: 'Home collection fee is too high.' })
  homeSampleFee?: number;

  @Transform(toBranches)
  @IsArray({ message: 'branches must be an array.' })
  @ArrayMinSize(1, { message: 'Add at least one branch.' })
  @ArrayMaxSize(MAX_BRANCHES, { message: `You can register up to ${MAX_BRANCHES} branches.` })
  @ValidateNested({ each: true })
  branches!: CreateBranchDto[];
}

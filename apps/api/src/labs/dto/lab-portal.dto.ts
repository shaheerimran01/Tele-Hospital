import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { RegulatoryBody } from '../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** "" -> null so a field can be cleared */
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

/** Accepts 03001234567, 3001234567, +923001234567, 92 300 1234567 … */
const PK_MOBILE = /^(\+?92|0)?\s*3\d{2}[\s-]?\d{7}$/;

// ---------------------------------------------------------------------------
// Phone + OTP sign-in
// ---------------------------------------------------------------------------

export class SendLabOtpDto {
  @Transform(trim)
  @IsString()
  @Matches(PK_MOBILE, { message: 'Enter a valid Pakistani mobile number, e.g. 0300 1234567.' })
  phone!: string;
}

export class VerifyLabOtpDto extends SendLabOtpDto {
  @Transform(trim)
  @IsString()
  @Matches(/^\d{4}$/, { message: 'OTP must be 4 digits.' })
  otp!: string;
}

// ---------------------------------------------------------------------------
// Dashboard edits (every field optional: undefined = keep)
// ---------------------------------------------------------------------------

export class UpdateLabProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email?: string;

  /** null / "" clears it */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s\-()]/g, '') || null : value))
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'WhatsApp number must be in international format, e.g. +923001234567.' })
  whatsappNumber?: string | null;

  @IsOptional()
  @IsBoolean()
  hasHomeSample?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100000)
  homeSampleFee?: number;
}

/** Multipart text fields that come with a new license document / logo */
export class UpdateLabDocumentsDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || undefined : value))
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9\-/. ]{1,38}[A-Z0-9]$/, { message: 'License number must be 3 to 40 letters, numbers, dashes or slashes.' })
  licenseNumber?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(RegulatoryBody, { message: `regulatoryBody must be one of: ${Object.values(RegulatoryBody).join(', ')}.` })
  regulatoryBody?: RegulatoryBody;
}

export class UpdateBranchDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Branch name is required.' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Medical director / pathologist name is required.' })
  @MaxLength(120)
  medicalDirectorName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9][A-Z0-9\-/ ]{1,18}[A-Z0-9]$/, {
    message: 'Medical council license number must be 3 to 20 letters, numbers or dashes, e.g. 12345-P.',
  })
  medicalCouncilLicenseNo?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'Branch address is too short.' })
  @MaxLength(500)
  address?: string;

  /** null / "" clears it */
  @IsOptional()
  @Transform(trimOrNull)
  @Matches(/^\+?[0-9][0-9\s\-()]{6,19}$/, { message: 'Branch phone must be a valid phone number, e.g. 042 35761234.' })
  phone?: string | null;
}

import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Multipart sends everything as text: "true" / "false" / "" -> boolean / undefined */
const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
};

/**
 * "" / null -> undefined so an unset map pin is simply "optional".
 * Reads the raw input (obj[key]): @Type(() => Number) would already have turned "" into 0.
 */
const toOptionalNumber = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number') return raw;
  const text = String(raw).trim();
  return text === '' ? undefined : Number(text);
};

export class CreateBranchDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Branch name is required.' })
  @MaxLength(120)
  name!: string;

  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  isMainCenter?: boolean;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Medical director / pathologist name is required.' })
  @MaxLength(120)
  medicalDirectorName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty({ message: 'Medical council license number is required.' })
  @Matches(/^[A-Z0-9][A-Z0-9\-/ ]{1,18}[A-Z0-9]$/, {
    message: 'Medical council license number must be 3 to 20 letters, numbers or dashes, e.g. 12345-P.',
  })
  medicalCouncilLicenseNo!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Branch address is required.' })
  @MinLength(5, { message: 'Branch address is too short.' })
  @MaxLength(500)
  address!: string;

  /** Branch phone / helpline (mobile or landline), optional */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value === null ? undefined : value))
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9][0-9\s\-()]{6,19}$/, { message: 'Branch phone must be a valid phone number, e.g. 042 35761234 or +923001234567.' })
  phone?: string;

  @Type(() => Number)
  @Transform(toOptionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Latitude must be a number.' })
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @Type(() => Number)
  @Transform(toOptionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Longitude must be a number.' })
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;
}

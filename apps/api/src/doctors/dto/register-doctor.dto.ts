import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Shared helpers (days / times)
// ---------------------------------------------------------------------------

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** Stored time format, e.g. "09:00 AM", "01:30 PM" (matches the schema comments). */
export const TIME_FORMAT_REGEX = /^(0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/;

/** "monday", "MON", " Monday " -> "Monday". Unknown values are returned unchanged. */
export function normalizeDay(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim().toLowerCase();
  const match = DAYS_OF_WEEK.find(
    (d) => d.toLowerCase() === v || d.toLowerCase().slice(0, 3) === v,
  );
  return match ?? value.trim();
}

/**
 * Accepts "9:00 am", "09:00AM", "9 PM" or 24h "14:30" and returns "hh:mm AM/PM".
 * Unparseable values are returned unchanged so the regex check rejects them.
 */
export function normalizeTime(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim().toUpperCase().replace(/\./g, '');

  const twelve = v.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (twelve) {
    const h = Number(twelve[1]);
    const m = twelve[2] ?? '00';
    if (h < 1 || h > 12 || Number(m) > 59) return value;
    return `${String(h).padStart(2, '0')}:${m} ${twelve[3]}`;
  }

  const twentyFour = v.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const h = Number(twentyFour[1]);
    const m = twentyFour[2];
    if (h > 23 || Number(m) > 59) return value;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${m} ${suffix}`;
  }

  return value;
}

/** "01:30 PM" -> 810 (minutes since midnight). Expects the normalized format. */
export function timeToMinutes(time: string): number {
  const [hm, period] = time.split(' ');
  const [h, m] = hm.split(':').map(Number);
  const hours24 = (h % 12) + (period === 'PM' ? 12 : 0);
  return hours24 * 60 + m;
}

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v === '' ? undefined : v;
};

/** Trims, drops empty entries and removes case-insensitive duplicates. */
const cleanStringArray = ({ value }: { value: unknown }) => {
  const list =
    typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : null;
  if (!list) return value;
  const seen = new Set<string>();
  return list
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => {
      const key = v.toLowerCase();
      if (!v || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
};

const TIME_MESSAGE = 'must be a time like "09:00 AM" or "14:30"';

// ---------------------------------------------------------------------------
// Time slot DTOs
// ---------------------------------------------------------------------------

export class DoctorAvailabilityDto {
  @Transform(({ value }) => normalizeDay(value))
  @IsIn(DAYS_OF_WEEK, { message: `dayOfWeek must be one of: ${DAYS_OF_WEEK.join(', ')}` })
  dayOfWeek: string;

  @Transform(({ value }) => normalizeTime(value))
  @IsString()
  @Matches(TIME_FORMAT_REGEX, { message: `startTime ${TIME_MESSAGE}` })
  startTime: string;

  @Transform(({ value }) => normalizeTime(value))
  @IsString()
  @Matches(TIME_FORMAT_REGEX, { message: `endTime ${TIME_MESSAGE}` })
  endTime: string;
}

/** Same shape as an online availability slot, but attached to a clinic. */
export class DoctorClinicScheduleDto extends DoctorAvailabilityDto {}

// ---------------------------------------------------------------------------
// Clinic DTO
// ---------------------------------------------------------------------------

export class DoctorClinicDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Clinic name is required' })
  @MaxLength(150)
  name: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(/^\+?[0-9\s-]{7,20}$/, { message: 'Clinic phone number is not valid' })
  phone?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'inPersonFee must be a number' })
  @Min(0)
  @Max(1_000_000)
  inPersonFee: number;

  // OpenStreetMap location
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Clinic address is required' })
  @MaxLength(500)
  address: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'latitude must be a number' })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'longitude must be a number' })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => DoctorClinicScheduleDto)
  schedules?: DoctorClinicScheduleDto[];
}

// ---------------------------------------------------------------------------
// Registration DTO
// ---------------------------------------------------------------------------

export class RegisterDoctorDto {
  // 1. Personal information
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MaxLength(100)
  fullName: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Title is required (e.g. "Consultant Family Physician")' })
  @MaxLength(150)
  title: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Degrees are required (e.g. "MBBS, FCPS")' })
  @MaxLength(200)
  degrees: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, '') : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'PMDC number is required' })
  @Matches(/^[A-Z0-9-]{3,30}$/, {
    message: 'PMDC number may only contain letters, numbers and dashes',
  })
  pmdcNumber: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1000)
  pmdcCertificateUrl?: string;

  @Type(() => Number)
  @IsInt({ message: 'experienceYears must be a whole number' })
  @Min(0)
  @Max(70)
  experienceYears: number;

  @Transform(cleanStringArray)
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one language' })
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  languages: string[];

  @Transform(trim)
  @IsString()
  @Matches(/^\+?[0-9\s-]{7,20}$/, { message: 'Phone number is not valid' })
  phone: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail({}, { message: 'Email address is not valid' })
  email?: string;

  @Transform(cleanStringArray)
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one specialisation' })
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  specialisations: string[];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(300)
  education?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(3000)
  about?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1000)
  profilePhotoUrl?: string;

  // 2. Consultation types (no duration / time fields)
  @Transform(toBoolean)
  @IsBoolean()
  isVideoCallEnabled: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'videoCallFee must be a number' })
  @Min(0)
  @Max(1_000_000)
  videoCallFee?: number;

  @Transform(toBoolean)
  @IsBoolean()
  isTextConsultEnabled: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'textConsultFee must be a number' })
  @Min(0)
  @Max(1_000_000)
  textConsultFee?: number;

  // 3. Clinics (in-person consultation)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DoctorClinicDto)
  clinics?: DoctorClinicDto[];

  // 4. Online (video / text) availability
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => DoctorAvailabilityDto)
  onlineAvailabilities?: DoctorAvailabilityDto[];
}

import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { OTP_ROLES, type OtpRole } from '../../otp/otp.service.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

/** POST /auth/send-otp   { phone: "03001234567", role?: "USER" | "DOCTOR" | "PHARMACY" | "LAB" } */
export class SendOtpDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  @MaxLength(20)
  phone!: string;

  /** defaults to USER (patients) */
  @IsOptional()
  @Transform(upper)
  @IsIn(OTP_ROLES, { message: 'role must be one of USER, DOCTOR, PHARMACY, LAB.' })
  role?: OtpRole;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { SendOtpDto } from './send-otp.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** POST /auth/verify-otp   { phone, code, role? }  ("otp" is accepted instead of "code" for older clients) */
export class VerifyOtpDto extends SendOtpDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10)
  otp?: string;
}

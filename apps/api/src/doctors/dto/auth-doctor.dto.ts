import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Accepts 03001234567, 3001234567, +923001234567, 92 300 1234567 … */
const PK_MOBILE = /^(\+?92|0)?\s*3\d{2}[\s-]?\d{7}$/;

export class SendDoctorOtpDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(PK_MOBILE, { message: 'Enter a valid Pakistani mobile number, e.g. 0300 1234567' })
  phone: string;
}

export class VerifyDoctorOtpDto extends SendDoctorOtpDto {
  @Transform(trim)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;
}

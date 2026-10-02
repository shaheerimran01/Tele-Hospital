import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsNotEmpty 
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreatePharmacyDto {
  // Phase 1: Pharmacy & Owner
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsString()
  @IsOptional()
  pharmacyType?: string;

  @IsString()
  @IsNotEmpty()
  pharmacistName: string;

  @IsString()
  @IsNotEmpty()
  pharmacistRegNum: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  // Phase 2: Documents
  @IsString()
  @IsNotEmpty()
  drugLicenseNumber: string;

  @IsString()
  @IsOptional()
  drugLicensePhotoUrl?: string;

  @IsString()
  @IsNotEmpty()
  cnicNtnNumber: string;

  @IsString()
  @IsOptional()
  cnicFrontPhotoUrl?: string;

  @IsString()
  @IsOptional()
  cnicBackPhotoUrl?: string;

  // Phase 3: Location & Hours
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOpen247?: boolean;

  // Phase 4: Payout & Agreement
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsNotEmpty()
  accountTitle: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  coldChainStorage?: boolean;

  @IsString()
  @IsOptional()
  referralCode?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  agreedToTerms?: boolean;
}
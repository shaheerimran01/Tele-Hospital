import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RelationType } from '../../generated/prisma/enums.js';

export const FAMILY_MEMBER_GENDERS = ['Male', 'Female', 'Other'] as const;
export type FamilyMemberGender = (typeof FAMILY_MEMBER_GENDERS)[number];

export class CreateFamilyMemberDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MaxLength(100)
  fullName: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(Object.values(RelationType), {
    message: `relation must be one of: ${Object.values(RelationType).join(', ')}`,
  })
  relation: RelationType;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim().toLowerCase();
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
  })
  @IsIn(FAMILY_MEMBER_GENDERS, {
    message: `gender must be one of: ${FAMILY_MEMBER_GENDERS.join(', ')}`,
  })
  gender: FamilyMemberGender;

  @Type(() => Number)
  @IsInt({ message: 'Age must be a whole number' })
  @Min(0)
  @Max(120)
  age: number;

  @IsOptional()
  @IsDateString({}, { message: 'dateOfBirth must be an ISO date string' })
  dateOfBirth?: string;
}

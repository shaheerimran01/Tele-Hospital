import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** "" -> undefined, "31.52" -> 31.52 (read from the raw query value) */
const optionalNumber = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) return undefined;
  return Number(raw);
};

/** GET /patient/labs-for-test?labPackageId=&userLat=&userLng= */
export class LabsForTestQueryDto {
  @IsUUID('all', { message: 'labPackageId must be a valid test or package ID.' })
  labPackageId!: string;

  @IsOptional()
  @Type(() => Number)
  @Transform(optionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'userLat must be a number.' })
  @Min(-90)
  @Max(90)
  userLat?: number;

  @IsOptional()
  @Type(() => Number)
  @Transform(optionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'userLng must be a number.' })
  @Min(-180)
  @Max(180)
  userLng?: number;
}

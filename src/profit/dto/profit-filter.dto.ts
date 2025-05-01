import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SackType } from '@prisma/client';

export class ProfitFilterDto {
  @IsOptional()
  @IsString()
  date?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  productSearch?: string;

  @IsOptional()
  @IsString()
  priceType?: 'SACK' | 'KILO';

  @IsOptional()
  @IsEnum(SackType)
  sackType?: SackType;
}

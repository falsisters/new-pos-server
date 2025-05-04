import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SackType } from '@prisma/client';

export class TotalSalesFilterDto {
  @IsOptional()
  @IsString()
  date?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  priceType?: 'SACK' | 'KILO';

  @IsOptional()
  @IsEnum(SackType)
  sackType?: SackType;
}

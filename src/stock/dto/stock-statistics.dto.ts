import { IsOptional, IsString } from 'class-validator';

export class StockStatisticsFilterDto {
  @IsOptional()
  @IsString()
  date?: string; // Format: YYYY-MM-DD
}

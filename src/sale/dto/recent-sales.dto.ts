import { IsOptional, IsString } from 'class-validator';

export class RecentSalesFilterDto {
  @IsOptional()
  @IsString()
  date?: string; // Format: YYYY-MM-DD
}

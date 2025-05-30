import { IsOptional, IsString } from 'class-validator';

export class TransferFilterDto {
  @IsOptional()
  @IsString()
  date?: string; // Format: YYYY-MM-DD
}

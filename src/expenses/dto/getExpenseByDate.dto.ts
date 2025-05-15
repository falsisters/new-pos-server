import { IsOptional, IsString } from 'class-validator';

export class GetExpenseByDateDto {
  @IsOptional()
  @IsString()
  date?: string; // Format: YYYY-MM-DD
}

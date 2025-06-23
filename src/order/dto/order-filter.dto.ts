import { OrderStatus } from '@prisma/client';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class OrderFilterDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  startDate?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsString()
  endDate?: string; // Format: YYYY-MM-DD
}

import { SackType } from '@prisma/client';
import { IsOptional, IsNumber, IsBoolean, IsString } from 'class-validator';

class PerKiloPriceDto {
  @IsOptional()
  @IsString()
  id: string;

  @IsOptional()
  @IsNumber()
  quantity: number;
}

class SackPriceDto {
  @IsOptional()
  @IsString()
  id: string;

  @IsOptional()
  @IsNumber()
  quantity: number;

  @IsOptional()
  type: SackType;
}

class OrderItemDto {
  @IsOptional()
  @IsString()
  id: string; // Product ID

  @IsOptional()
  @IsBoolean()
  isSpecialPrice?: boolean;

  @IsOptional()
  sackPrice?: SackPriceDto;

  @IsOptional()
  perKiloPrice?: PerKiloPriceDto;
}

export class EditOrderDto {
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  orderItem?: OrderItemDto[];
}

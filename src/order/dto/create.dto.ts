import { SackType } from '@prisma/client';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
} from 'class-validator';

class PerKiloPriceDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;
}

class SackPriceDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  type: SackType;
}

class OrderItemDto {
  @IsNotEmpty()
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

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsNotEmpty()
  @IsNumber()
  totalPrice: number;

  @IsNotEmpty()
  orderItem: OrderItemDto[];
}

import { PaymentMethod, SackType } from '@prisma/client';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsNumberString,
} from 'class-validator';

class PerKiloPriceDto {
  @IsString()
  id: string;

  @IsNumberString()
  quantity: string;
}

class SackPriceDto {
  @IsString()
  id: string;

  @IsNumberString()
  quantity: string;

  type: SackType;
}

class ProductDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsNumberString()
  discountedPrice?: string | null;

  @IsOptional()
  @IsBoolean()
  isDiscounted: boolean = false;

  @IsOptional()
  isGantang: boolean;

  @IsOptional()
  isSpecialPrice: boolean;

  @IsOptional()
  perKiloPrice: PerKiloPriceDto;

  @IsOptional()
  sackPrice: SackPriceDto;
}

export class CreateSaleDto {
  @IsNumberString()
  totalAmount: string;

  @IsString()
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  saleItem: ProductDto[];

  @IsOptional()
  @IsNumberString()
  changeAmount?: string | null;

  @IsOptional()
  @IsString()
  cashierId: string;

  @IsOptional()
  @IsString()
  cashierName: string;

  @IsOptional()
  metadata: Record<string, any>;
}

import { PaymentMethod, SackType } from '@prisma/client';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

class PerKiloPriceDto {
  id: string;
  quantity: number;
}

class SackPriceDto {
  id: string;
  quantity: number;
  type: SackType;
}

class ProductDto {
  id: string;

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
  @IsNumber()
  totalAmount: number;

  @IsString()
  paymentMethod: PaymentMethod;

  @IsOptional()
  orderId: string;

  @IsNotEmpty()
  saleItem: ProductDto[];
}

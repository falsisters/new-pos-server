import { PaymentMethod, SackType } from '@prisma/client';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

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
  discountedPrice: number;

  @IsOptional()
  @IsBoolean()
  isDiscounted: boolean = false;

  @IsOptional()
  isSpecialPrice: boolean;

  @IsOptional()
  isGantang: boolean;

  @IsOptional()
  perKiloPrice: PerKiloPriceDto;

  @IsOptional()
  sackPrice: SackPriceDto;
}

export class EditSaleDto {
  @IsNumber()
  @IsOptional()
  totalAmount: number;

  @IsOptional()
  orderId: string;

  @IsString()
  @IsOptional()
  paymentMethod: PaymentMethod;

  @IsNotEmpty()
  saleItem: ProductDto[];
}

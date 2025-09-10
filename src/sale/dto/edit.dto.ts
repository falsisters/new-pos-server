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
  price?: string | null;

  @IsOptional()
  @IsNumberString()
  discountedPrice?: string | null;

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
  @IsNumberString()
  @IsOptional()
  totalAmount?: string;

  @IsOptional()
  @IsString()
  orderId: string;

  @IsString()
  @IsOptional()
  paymentMethod: PaymentMethod;

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

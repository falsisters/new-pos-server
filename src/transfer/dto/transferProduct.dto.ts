import { SackType } from '@prisma/client';
import { IsNotEmpty, IsOptional } from 'class-validator';

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
  @IsNotEmpty()
  id: string;

  @IsOptional()
  sackPrice: SackPriceDto;

  @IsOptional()
  perKiloPrice: PerKiloPriceDto;
}

export class TransferProductDto {
  @IsNotEmpty()
  product: ProductDto;
}

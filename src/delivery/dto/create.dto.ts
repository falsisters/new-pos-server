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

export class CreateDeliveryDto {
  @IsNotEmpty()
  driverName: string;

  @IsNotEmpty()
  deliveryTimeStart: Date;

  @IsNotEmpty()
  deliveryItem: ProductDto[];
}

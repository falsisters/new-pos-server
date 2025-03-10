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

class DeliveryItemDto {
  @IsNotEmpty()
  quantity: number;

  @IsNotEmpty()
  product: ProductDto;
}

export class CreateDeliveryDto {
  @IsNotEmpty()
  driverName: string;

  @IsNotEmpty()
  deliveryTimeStart: Date;

  @IsNotEmpty()
  deliveryItem: DeliveryItemDto[];
}

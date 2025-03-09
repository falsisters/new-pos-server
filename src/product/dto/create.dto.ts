import { SackType } from '@prisma/client';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class SpecialPrice {
  price: number;
  minimumQty: number;
}

class SackPriceDto {
  price: number;
  stock: number;
  type: SackType;
  specialPrice: SpecialPrice;
}

class PerKiloPrice {
  price: number;
  stock: number;
}

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  picture: Express.Multer.File;

  @IsArray()
  sackPrice: SackPriceDto[];

  @IsOptional()
  perKiloPrice: PerKiloPrice;
}

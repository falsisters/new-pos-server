import { SackType } from '@prisma/client';
import { IsArray, IsOptional, IsString } from 'class-validator';

class SpecialPrice {
  @IsOptional()
  id: string;

  @IsOptional()
  price: number;

  @IsOptional()
  minimumQty: number;
}

class SackPriceDto {
  @IsOptional()
  id: string;

  @IsOptional()
  price: number;

  @IsOptional()
  stock: number;

  @IsOptional()
  type: SackType;

  @IsOptional()
  specialPrice: SpecialPrice;
}

class PerKiloPrice {
  @IsOptional()
  price: number;

  @IsOptional()
  stock: number;
}

export class EditProductDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  picture: Express.Multer.File;

  @IsArray()
  @IsOptional()
  sackPrice: SackPriceDto[];

  @IsOptional()
  perKiloPrice: PerKiloPrice;
}

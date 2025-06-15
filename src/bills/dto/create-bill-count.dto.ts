import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillType } from '@prisma/client';

export class BillDto {
  @IsNumber()
  amount: number;

  @IsEnum(BillType)
  type: BillType;
}

export class CreateBillCountDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  beginningBalance?: number;

  @IsOptional()
  @IsBoolean()
  showBeginningBalance?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillDto)
  bills?: BillDto[];
}

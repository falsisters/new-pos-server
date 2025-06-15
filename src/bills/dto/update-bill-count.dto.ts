import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillDto } from './create-bill-count.dto';

export class UpdateBillCountDto {
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

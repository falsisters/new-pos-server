import { BillType } from '@prisma/client';
import { IsOptional } from 'class-validator';

export class UpdateBillCountDto {
  @IsOptional()
  expenses: number;

  @IsOptional()
  beginningBalance: number;

  @IsOptional()
  bills: {
    id: string;
    amount: number;
    type: BillType;
  }[];
}

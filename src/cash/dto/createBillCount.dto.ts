import { BillType } from '@prisma/client';
import { IsNotEmpty } from 'class-validator';

export class CreateBillCountDto {
  expenses: number;
  beginningBalance: number;
  bills: {
    amount: number;
    type: BillType;
  }[];
}

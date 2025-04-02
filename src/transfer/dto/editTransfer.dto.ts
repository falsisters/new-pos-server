import { TransferType } from '@prisma/client';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class EditTransferDto {
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  type: TransferType;
}

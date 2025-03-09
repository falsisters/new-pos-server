import { CashierPermissions } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EditCashierDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  accessKey: string;

  @IsNotEmpty()
  @IsOptional()
  permissions: CashierPermissions[];
}

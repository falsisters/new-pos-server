import { CashierPermissions } from '@prisma/client';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterCashierDto {
  @IsString()
  @MinLength(4)
  name: string;

  @IsString()
  @MinLength(4)
  accessKey: string;

  @IsNotEmpty()
  permissions: CashierPermissions[];
}

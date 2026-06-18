import { CashierPermissions } from '@prisma/client';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterCashierDto {
  @IsString()
  @MinLength(4)
  @Matches(/^\S+$/, { message: 'Name must be a single word without spaces' })
  name: string;

  @IsString()
  @MinLength(4)
  accessKey: string;

  @IsNotEmpty()
  permissions: CashierPermissions[];
}

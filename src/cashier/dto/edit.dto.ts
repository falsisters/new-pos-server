import { CashierPermissions } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class EditCashierDto {
  @IsString()
  @IsOptional()
  @Matches(/^\S+$/, { message: 'Name must be a single word without spaces' })
  name: string;

  @IsString()
  @IsOptional()
  accessKey: string;

  @IsNotEmpty()
  @IsOptional()
  permissions: CashierPermissions[];
}

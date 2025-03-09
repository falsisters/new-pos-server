import { Employee } from '@prisma/client';
import { IsArray, IsNotEmpty, IsOptional } from 'class-validator';

export class EditShiftDto {
  @IsNotEmpty()
  @IsOptional()
  cashierId: string;

  @IsArray()
  @IsOptional()
  employees: Employee[];
}

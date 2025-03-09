import { Employee } from '@prisma/client';
import { IsArray, IsNotEmpty } from 'class-validator';

export class CreateShiftDto {
  @IsNotEmpty()
  cashierId: string;

  @IsArray()
  employees: Employee[];
}

import { Employee } from '@prisma/client';
import { IsArray } from 'class-validator';

export class CreateShiftDto {
  @IsArray()
  employees: Employee[];
}

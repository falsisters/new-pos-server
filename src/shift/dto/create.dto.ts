import { IsArray } from 'class-validator';

export class CreateShiftDto {
  @IsArray()
  employees: string[];
}

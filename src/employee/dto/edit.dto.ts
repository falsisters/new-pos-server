import { IsOptional } from 'class-validator';

export class EditEmployeeDto {
  @IsOptional()
  name: string;
}

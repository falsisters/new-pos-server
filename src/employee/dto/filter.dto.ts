import { IsOptional, IsString } from 'class-validator';

export class EmployeeFilterDto {
  @IsOptional()
  @IsString()
  branch?: string;
}

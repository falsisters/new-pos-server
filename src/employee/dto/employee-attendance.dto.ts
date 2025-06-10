import { IsOptional, IsString } from 'class-validator';

export class EmployeeAttendanceFilterDto {
  @IsOptional()
  @IsString()
  startDate?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsString()
  endDate?: string; // Format: YYYY-MM-DD
}

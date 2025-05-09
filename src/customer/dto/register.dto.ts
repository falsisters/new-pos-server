import { IsString, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @IsString()
  @MinLength(4)
  email: string;

  @IsString()
  @MinLength(4)
  name: string;

  @IsString()
  @MinLength(4)
  phone: string;

  @IsString()
  @MinLength(4)
  address: string;

  @IsString()
  @MinLength(4)
  password: string;
}

import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @MaxLength(14)
  name: string;

  @MinLength(8)
  password: string;
}

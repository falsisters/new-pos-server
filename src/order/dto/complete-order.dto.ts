import { IsNotEmpty, IsString } from 'class-validator';

export class CompleteOrderDto {
  @IsNotEmpty()
  @IsString()
  saleId: string;
}

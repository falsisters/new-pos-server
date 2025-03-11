import { IsNotEmpty, IsNumber } from 'class-validator';

export class TransferDeliveryDto {
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  name: string;
}

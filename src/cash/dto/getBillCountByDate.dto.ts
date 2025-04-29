import { IsNotEmpty } from 'class-validator';

export class GetBillCountByDateDto {
  @IsNotEmpty()
  date: Date;
}

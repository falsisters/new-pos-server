import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

class ExpenseItem {
  name: string;
  amount: number;
}

export class CreateExpenseDto {
  expenseItems: ExpenseItem[];

  @IsOptional()
  @IsString()
  date?: string; // Format: YYYY-MM-DD
}

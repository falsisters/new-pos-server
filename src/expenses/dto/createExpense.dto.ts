import { IsNotEmpty } from 'class-validator';

class ExpenseItem {
  name: string;
  amount: number;
}

export class CreateExpenseDto {
  expenseItems: ExpenseItem[];
}

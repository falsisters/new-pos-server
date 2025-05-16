import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExpenseDto } from './dto/createExpense.dto';
import { GetExpenseByDateDto } from './dto/getExpenseByDate.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async createExpense(userId: string, createExpenseDto: CreateExpenseDto) {
    const itemsToProcess = createExpenseDto.expenseItems || [];

    // Get today's date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.$transaction(async (tx) => {
      // Check if there's already an expense list for today
      const existingExpense = await tx.expenseList.findFirst({
        where: {
          userId,
          createdAt: {
            gte: today,
            lte: endOfDay,
          },
        },
      });

      if (existingExpense) {
        // If exists, update the existing expense list
        return await tx.expenseList.update({
          where: { id: existingExpense.id },
          data: {
            ExpenseItems: {
              deleteMany: {},
              create: itemsToProcess.map((item) => ({
                name: item.name,
                amount: item.amount,
              })),
            },
          },
          include: {
            ExpenseItems: true,
          },
        });
      } else {
        // If not exists, create a new expense list
        return await tx.expenseList.create({
          data: {
            userId,
            ExpenseItems: {
              create: itemsToProcess.map((item) => ({
                name: item.name,
                amount: item.amount,
              })),
            },
          },
          include: {
            ExpenseItems: true,
          },
        });
      }
    });
  }

  async editExpense(expenseListId: string, editExpenseDto: CreateExpenseDto) {
    const itemsToProcess = editExpenseDto.expenseItems || [];

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expenseList.update({
        where: { id: expenseListId },
        data: {
          ExpenseItems: {
            deleteMany: {},
            create: itemsToProcess.map((item) => ({
              name: item.name,
              amount: item.amount,
            })),
          },
        },
      });

      return expense;
    });
  }

  async getExpenseList(userId: string) {
    return this.prisma.expenseList.findMany({
      where: { userId },
      include: {
        ExpenseItems: true,
      },
    });
  }

  async getExpenseById(expenseListId: string) {
    return this.prisma.expenseList.findUnique({
      where: { id: expenseListId },
      include: {
        ExpenseItems: true,
      },
    });
  }

  async getFirstExpenseByDay(userId: string, expenseDate: GetExpenseByDateDto) {
    // Use provided date or default to today
    const { date } = expenseDate;

    let targetDate: Date;
    if (date) {
      // Parse the string date in YYYY-MM-DD format
      targetDate = new Date(date);
    } else {
      targetDate = new Date();
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.expenseList.findFirst({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        ExpenseItems: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async deleteExpense(expenseListId: string) {
    return this.prisma.expenseList.delete({
      where: { id: expenseListId },
    });
  }
}

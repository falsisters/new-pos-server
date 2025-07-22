import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExpenseDto } from './dto/createExpense.dto';
import { GetExpenseByDateDto } from './dto/getExpenseByDate.dto';
import { convertToManilaTime, getManilaDateBounds } from 'src/utils/date.util';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  private formatExpenseList(expenseList: any) {
    if (!expenseList) return null;
    return {
      ...expenseList,
      createdAt: convertToManilaTime(expenseList.createdAt),
      updatedAt: convertToManilaTime(expenseList.updatedAt),
      ExpenseItems: expenseList.ExpenseItems
        ? expenseList.ExpenseItems.map((item) => ({
            ...item,
            createdAt: convertToManilaTime(item.createdAt),
            updatedAt: convertToManilaTime(item.updatedAt),
          }))
        : [],
    };
  }

  async createExpense(cashierId: string, createExpenseDto: CreateExpenseDto) {
    const itemsToProcess = createExpenseDto.expenseItems || [];

    // Use provided date or default to today, handle Manila Time properly
    const { startOfDay, endOfDay } = createExpenseDto.date
      ? getManilaDateBounds(createExpenseDto.date)
      : getManilaDateBounds();

    const targetDate = createExpenseDto.date
      ? new Date(createExpenseDto.date)
      : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Check if there's already an expense list for the target date
      const existingExpense = await tx.expenseList.findFirst({
        where: {
          cashierId,
          createdAt: {
            gte: startOfDay,
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
        // If not exists, create a new expense list with the target date
        return await tx.expenseList.create({
          data: {
            cashierId,
            createdAt: targetDate, // Set the creation date to the target date
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
    return this.formatExpenseList(result);
  }

  async editExpense(expenseListId: string, editExpenseDto: CreateExpenseDto) {
    const itemsToProcess = editExpenseDto.expenseItems || [];

    const result = await this.prisma.$transaction(async (tx) => {
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
        include: {
          ExpenseItems: true,
        },
      });

      return expense;
    });
    return this.formatExpenseList(result);
  }

  async getExpenseList(cashierId: string) {
    const expenses = await this.prisma.expenseList.findMany({
      where: { cashierId },
      include: {
        ExpenseItems: true,
      },
    });
    return expenses.map((e) => this.formatExpenseList(e));
  }

  async getExpenseById(expenseListId: string) {
    const expense = await this.prisma.expenseList.findUnique({
      where: { id: expenseListId },
      include: {
        ExpenseItems: true,
      },
    });
    return this.formatExpenseList(expense);
  }

  async getFirstExpenseByDay(
    cashierId: string,
    expenseDate: GetExpenseByDateDto,
  ) {
    // Use provided date or default to today, handle Manila Time properly
    const { startOfDay, endOfDay } = getManilaDateBounds(expenseDate.date);

    const expense = await this.prisma.expenseList.findFirst({
      where: {
        cashierId,
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
    return this.formatExpenseList(expense);
  }

  async deleteExpense(expenseListId: string) {
    const expense = await this.prisma.expenseList.delete({
      where: { id: expenseListId },
    });
    return this.formatExpenseList(expense);
  }

  // User oversight methods
  async createUserExpense(userId: string, createExpenseDto: CreateExpenseDto) {
    const itemsToProcess = createExpenseDto.expenseItems || [];

    // Use provided date or default to today, handle Manila Time properly
    const { startOfDay, endOfDay } = createExpenseDto.date
      ? getManilaDateBounds(createExpenseDto.date)
      : getManilaDateBounds();

    const targetDate = createExpenseDto.date
      ? new Date(createExpenseDto.date)
      : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Check if there's already an expense list for the target date
      const existingExpense = await tx.expenseList.findFirst({
        where: {
          userId,
          createdAt: {
            gte: startOfDay,
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
        // If not exists, create a new expense list with the target date
        return await tx.expenseList.create({
          data: {
            userId,
            createdAt: targetDate, // Set the creation date to the target date
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
    return this.formatExpenseList(result);
  }

  async getUserExpenseByDate(userId: string, expenseDate: GetExpenseByDateDto) {
    // Use provided date or default to today, handle Manila Time properly
    const { startOfDay, endOfDay } = getManilaDateBounds(expenseDate.date);

    const expense = await this.prisma.expenseList.findFirst({
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
    return this.formatExpenseList(expense);
  }

  async getAllUserExpensesByDate(date?: string) {
    // Handle Manila Time properly
    const { startOfDay, endOfDay } = getManilaDateBounds(date);

    const expenses = await this.prisma.expenseList.findMany({
      where: {
        userId: { not: null },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        ExpenseItems: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return expenses.map((e) => this.formatExpenseList(e));
  }

  async getAllCashierExpensesByDate(date?: string) {
    // Handle Manila Time properly
    const { startOfDay, endOfDay } = getManilaDateBounds(date);

    const expenses = await this.prisma.expenseList.findMany({
      where: {
        cashierId: { not: null },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        ExpenseItems: true,
        cashier: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return expenses.map((e) => this.formatExpenseList(e));
  }
}

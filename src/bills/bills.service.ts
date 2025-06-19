import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBillCountDto } from './dto/create-bill-count.dto';
import { UpdateBillCountDto } from './dto/update-bill-count.dto';
import { BillType, PaymentMethod } from '@prisma/client';

@Injectable()
export class BillsService {
  constructor(private prisma: PrismaService) {}

  // Helper function to convert UTC to Philippine time (UTC+8)
  private convertToPhilippineTime(utcDate: Date): Date {
    const philippineTime = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
    return philippineTime;
  }

  async createOrUpdateBillCount(
    cashierId: string,
    createDto: CreateBillCountDto,
  ) {
    const targetDate = createDto.date ? new Date(createDto.date) : new Date();

    // Set start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if a bill count already exists for the specified day
    const existingBillCount = await this.prisma.billCount.findFirst({
      where: {
        cashierId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        Bills: true,
      },
    });

    if (existingBillCount) {
      // Update existing bill count
      return this.updateBillCount(existingBillCount.id, createDto);
    } else {
      // Create new bill count with the target date
      const billCount = await this.prisma.billCount.create({
        data: {
          cashierId,
          beginningBalance: createDto.beginningBalance || 0,
          showBeginningBalance: createDto.showBeginningBalance || false,
          createdAt: targetDate, // Set the creation date to the target date
        },
      });

      // Create bill entries if provided
      if (createDto.bills && createDto.bills.length > 0) {
        await Promise.all(
          createDto.bills.map((bill) =>
            this.prisma.bills.create({
              data: {
                amount: bill.amount,
                type: bill.type,
                billCountId: billCount.id,
              },
            }),
          ),
        );
      }

      return this.getBillCountById(billCount.id);
    }
  }

  async updateBillCount(billCountId: string, updateDto: UpdateBillCountDto) {
    // Update bill count details
    await this.prisma.billCount.update({
      where: { id: billCountId },
      data: {
        beginningBalance:
          updateDto.beginningBalance !== undefined
            ? updateDto.beginningBalance
            : undefined,
        showBeginningBalance:
          updateDto.showBeginningBalance !== undefined
            ? updateDto.showBeginningBalance
            : undefined,
      },
    });

    // If bills array is provided, update existing bills or create new ones
    if (updateDto.bills && updateDto.bills.length > 0) {
      // Delete existing bills
      await this.prisma.bills.deleteMany({
        where: { billCountId },
      });

      // Create new bills
      await Promise.all(
        updateDto.bills.map((bill) =>
          this.prisma.bills.create({
            data: {
              amount: bill.amount,
              type: bill.type,
              billCountId,
            },
          }),
        ),
      );
    }

    return this.getBillCountById(billCountId);
  }

  async getBillCountById(billCountId: string) {
    const billCount = await this.prisma.billCount.findUnique({
      where: { id: billCountId },
      include: {
        Bills: true,
        cashier: {
          select: {
            id: true,
            userId: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!billCount) {
      throw new NotFoundException(
        `Bill count with ID ${billCountId} not found`,
      );
    }

    // Use the billCount creation date for totalCash calculation
    const targetDate = billCount.createdAt;
    const ownerId = billCount.cashierId || billCount.userId;
    const isUser = !!billCount.userId;

    return this.formatBillCountResponse(billCount, ownerId, targetDate, isUser);
  }

  async getBillCountForDate(cashierId: string, date?: string) {
    // Set default date to today if not provided
    const targetDate = date ? new Date(date) : new Date();

    // Set start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const billCount = await this.prisma.billCount.findFirst({
      where: {
        cashierId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        Bills: true,
        cashier: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!billCount) {
      return null; // Return null for non-existing bill count
    }

    // Use the cashierId directly for calculations
    return this.formatBillCountResponse(
      billCount,
      cashierId,
      targetDate,
      false,
    );
  }

  // User oversight methods
  async createOrUpdateUserBillCount(
    userId: string,
    createDto: CreateBillCountDto,
  ) {
    const targetDate = createDto.date ? new Date(createDto.date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBillCount = await this.prisma.billCount.findFirst({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        Bills: true,
      },
    });

    if (existingBillCount) {
      return this.updateBillCount(existingBillCount.id, createDto);
    } else {
      const billCount = await this.prisma.billCount.create({
        data: {
          userId,
          beginningBalance: createDto.beginningBalance || 0,
          showBeginningBalance: createDto.showBeginningBalance || false,
          createdAt: targetDate, // Set the creation date to the target date
        },
      });

      if (createDto.bills && createDto.bills.length > 0) {
        await Promise.all(
          createDto.bills.map((bill) =>
            this.prisma.bills.create({
              data: {
                amount: bill.amount,
                type: bill.type,
                billCountId: billCount.id,
              },
            }),
          ),
        );
      }

      return this.getBillCountById(billCount.id);
    }
  }

  async getUserBillCountForDate(userId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const billCount = await this.prisma.billCount.findFirst({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        Bills: true,
      },
    });

    if (!billCount) {
      return null;
    }

    return this.formatBillCountResponse(billCount, userId, targetDate, true);
  }

  async getAllUserBillCountsByDate(date?: string) {
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const billCounts = await this.prisma.billCount.findMany({
      where: {
        userId: { not: null },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        Bills: true,
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

    return Promise.all(
      billCounts.map(async (billCount) => ({
        ...(await this.formatBillCountResponse(
          billCount,
          billCount.userId,
          targetDate,
          true,
        )),
        user: billCount.user,
      })),
    );
  }

  async getAllCashierBillCountsByDate(date?: string) {
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const billCounts = await this.prisma.billCount.findMany({
      where: {
        cashierId: { not: null },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        Bills: true,
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

    return Promise.all(
      billCounts.map(async (billCount) => ({
        ...(await this.formatBillCountResponse(
          billCount,
          billCount.cashier.user.id,
          targetDate,
          false,
        )),
        cashier: billCount.cashier,
      })),
    );
  }

  // Helper method to calculate total cash sales for a given date
  private async calculateTotalCash(
    ownerId: string,
    targetDate: Date,
    isUser: boolean,
  ): Promise<number> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    if (isUser) {
      // For users, get all cash sales from their cashiers
      const cashSales = await this.prisma.sale.findMany({
        where: {
          paymentMethod: PaymentMethod.CASH,
          cashier: {
            userId: ownerId,
          },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          totalAmount: true,
        },
      });

      return cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    } else {
      // For cashiers, use the cashierId directly
      const cashSales = await this.prisma.sale.findMany({
        where: {
          paymentMethod: PaymentMethod.CASH,
          cashierId: ownerId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          totalAmount: true,
        },
      });

      return cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    }
  }

  // Helper method to calculate total expenses for a given date
  private async calculateTotalExpenses(
    ownerId: string,
    targetDate: Date,
    isUser: boolean,
  ): Promise<number> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let expenseList;

    if (isUser) {
      expenseList = await this.prisma.expenseList.findFirst({
        where: {
          userId: ownerId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          ExpenseItems: true,
        },
      });
    } else {
      // For cashiers, use the cashierId directly
      expenseList = await this.prisma.expenseList.findFirst({
        where: {
          cashierId: ownerId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          ExpenseItems: true,
        },
      });
    }

    if (!expenseList) return 0;

    return expenseList.ExpenseItems.reduce((sum, item) => sum + item.amount, 0);
  }

  // Helper method to format bill count response
  private async formatBillCountResponse(
    billCount: any,
    ownerId: string,
    targetDate?: Date,
    isUser: boolean = false,
  ) {
    // Calculate total amount from all bills
    const billsTotal = billCount.Bills.reduce(
      (sum, bill) => sum + bill.amount * this.getBillValue(bill.type),
      0,
    );

    // Calculate total cash sales for the target date
    const dateForCashCalculation = targetDate || billCount.createdAt;
    const totalCash = await this.calculateTotalCash(
      ownerId,
      dateForCashCalculation,
      isUser,
    );

    // Calculate total expenses for the target date
    const totalExpenses = await this.calculateTotalExpenses(
      ownerId,
      dateForCashCalculation,
      isUser,
    );

    // Group bills by type for easy display
    const billsByType = {};

    // Initialize with all bill types set to 0
    Object.values(BillType).forEach((type) => {
      billsByType[type] = 0;
    });

    // Update with actual values
    billCount.Bills.forEach((bill) => {
      billsByType[bill.type] = bill.amount;
    });

    // Calculate net cash (Total Cash - Expenses)
    const netCash = totalCash - totalExpenses;

    // Calculate summary values
    const summaryStep1 =
      billsTotal -
      (billCount.showBeginningBalance ? billCount.beginningBalance : 0);
    const summaryFinal = summaryStep1 + totalExpenses;

    return {
      id: billCount.id,
      date: this.convertToPhilippineTime(billCount.createdAt),
      beginningBalance: billCount.beginningBalance,
      showBeginningBalance: billCount.showBeginningBalance,
      totalCash,
      totalExpenses,
      netCash,
      bills: billCount.Bills.map((bill) => ({
        id: bill.id,
        type: bill.type,
        amount: bill.amount,
        value: bill.amount * this.getBillValue(bill.type),
      })),
      billsByType,
      billsTotal,
      summaryStep1,
      summaryFinal,
    };
  }

  // Helper to get monetary value of each bill type
  private getBillValue(billType: BillType): number {
    switch (billType) {
      case BillType.THOUSAND:
        return 1000;
      case BillType.FIVE_HUNDRED:
        return 500;
      case BillType.HUNDRED:
        return 100;
      case BillType.FIFTY:
        return 50;
      case BillType.TWENTY:
        return 20;
      case BillType.COINS:
        return 1; // Assuming 1 peso per coin for calculation
      default:
        return 0;
    }
  }
}

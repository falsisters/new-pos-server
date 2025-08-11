import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBillCountDto } from './dto/create-bill-count.dto';
import { UpdateBillCountDto } from './dto/update-bill-count.dto';
import { BillType, PaymentMethod } from '@prisma/client';
import {
  convertToManilaTime,
  getManilaDateRangeForQuery,
  parseManilaDateForStorage,
} from 'src/utils/date.util';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BillsService {
  constructor(private prisma: PrismaService) {}

  private convertDecimalToString(value: Decimal | number): string {
    if (value instanceof Decimal) {
      return Math.ceil(value.toNumber()).toFixed(2);
    }
    return Math.ceil(Number(value)).toFixed(2);
  }

  private convertDecimalToNumber(value: Decimal | number): number {
    if (value instanceof Decimal) {
      return Math.ceil(value.toNumber());
    }
    return Math.ceil(Number(value));
  }

  async createOrUpdateBillCount(
    cashierId: string,
    createDto: CreateBillCountDto,
  ) {
    // Get UTC date range for querying
    const { startOfDay, endOfDay } = getManilaDateRangeForQuery(createDto.date);

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
      const updated = await this.updateBillCount(
        existingBillCount.id,
        createDto,
      );
      return updated;
    } else {
      // Create new bill count with UTC time for storage
      const targetDateUTC = parseManilaDateForStorage(createDto.date);

      const billCount = await this.prisma.billCount.create({
        data: {
          cashierId,
          beginningBalance: createDto.beginningBalance || 0,
          showBeginningBalance: createDto.showBeginningBalance || false,
          createdAt: targetDateUTC,
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
    // Get UTC date range for querying
    const { startOfDay, endOfDay } = getManilaDateRangeForQuery(date);

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
      return null;
    }

    // Use the original stored date for calculations
    return this.formatBillCountResponse(
      billCount,
      cashierId,
      billCount.createdAt,
      false,
    );
  }

  // User oversight methods
  async createOrUpdateUserBillCount(
    userId: string,
    createDto: CreateBillCountDto,
  ) {
    // Get UTC date range for querying
    const { startOfDay, endOfDay } = getManilaDateRangeForQuery(createDto.date);

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
      // Create new bill count with UTC time for storage
      const targetDateUTC = parseManilaDateForStorage(createDto.date);

      const billCount = await this.prisma.billCount.create({
        data: {
          userId,
          beginningBalance: createDto.beginningBalance || 0,
          showBeginningBalance: createDto.showBeginningBalance || false,
          createdAt: targetDateUTC,
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
    // Get UTC date range for querying
    const { startOfDay, endOfDay } = getManilaDateRangeForQuery(date);

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

    return this.formatBillCountResponse(
      billCount,
      userId,
      billCount.createdAt,
      true,
    );
  }

  async getAllUserBillCountsByDate(date?: string) {
    // Get UTC date range for querying
    const { startOfDay, endOfDay } = getManilaDateRangeForQuery(date);

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
          billCount.createdAt,
          true,
        )),
        user: billCount.user,
      })),
    );
  }

  async getAllCashierBillCountsByDate(date?: string) {
    // Get UTC date range for querying
    const { startOfDay, endOfDay } = getManilaDateRangeForQuery(date);

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
          billCount.createdAt,
          false,
        )),
        cashier: billCount.cashier,
      })),
    );
  }

  private async calculateTotalCash(
    ownerId: string,
    targetDateUTC: Date,
    isUser: boolean,
  ): Promise<number> {
    // Convert the stored UTC date back to Manila time to get the correct date
    const manilaDate = convertToManilaTime(targetDateUTC);
    const manilaDateString = manilaDate.toISOString().split('T')[0];

    // Get the proper UTC range for that Manila date
    const { startOfDay, endOfDay } =
      getManilaDateRangeForQuery(manilaDateString);

    if (isUser) {
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

      return cashSales.reduce(
        (sum, sale) => sum + this.convertDecimalToNumber(sale.totalAmount),
        0,
      );
    } else {
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

      return cashSales.reduce(
        (sum, sale) => sum + this.convertDecimalToNumber(sale.totalAmount),
        0,
      );
    }
  }

  private async calculateTotalExpenses(
    ownerId: string,
    targetDateUTC: Date,
    isUser: boolean,
  ): Promise<number> {
    // Convert the stored UTC date back to Manila time to get the correct date
    const manilaDate = convertToManilaTime(targetDateUTC);
    const manilaDateString = manilaDate.toISOString().split('T')[0];

    // Get the proper UTC range for that Manila date
    const { startOfDay, endOfDay } =
      getManilaDateRangeForQuery(manilaDateString);

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

    return expenseList.ExpenseItems.reduce(
      (sum, item) => sum + this.convertDecimalToNumber(item.amount),
      0,
    );
  }

  private async formatBillCountResponse(
    billCount: any,
    ownerId: string,
    targetDateUTC: Date,
    isUser: boolean = false,
  ) {
    // Calculate total amount from all bills
    const billsTotal = billCount.Bills.reduce(
      (sum, bill) => sum + bill.amount * this.getBillValue(bill.type),
      0,
    );

    // Calculate totals using the UTC date directly
    const totalCash = await this.calculateTotalCash(
      ownerId,
      targetDateUTC,
      isUser,
    );

    const totalExpenses = await this.calculateTotalExpenses(
      ownerId,
      targetDateUTC,
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
      (billCount.showBeginningBalance
        ? this.convertDecimalToNumber(billCount.beginningBalance)
        : 0);
    const summaryFinal = summaryStep1 + totalExpenses;

    return {
      id: billCount.id,
      date: convertToManilaTime(billCount.createdAt),
      updatedAt: convertToManilaTime(billCount.updatedAt),
      beginningBalance: this.convertDecimalToNumber(billCount.beginningBalance),
      showBeginningBalance: billCount.showBeginningBalance,
      totalCash,
      totalExpenses,
      netCash,
      bills: billCount.Bills.map((bill) => ({
        id: bill.id,
        type: bill.type,
        amount: bill.amount,
        value: bill.amount * this.getBillValue(bill.type),
        createdAt: convertToManilaTime(bill.createdAt),
        updatedAt: convertToManilaTime(bill.updatedAt),
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

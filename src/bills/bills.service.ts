import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBillCountDto } from './dto/create-bill-count.dto';
import { UpdateBillCountDto } from './dto/update-bill-count.dto';
import { BillType, PaymentMethod } from '@prisma/client';
import {
  formatDateForClient,
  createManilaDateFilter,
} from 'src/utils/date.util';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BillsService {
  constructor(private prisma: PrismaService) {}

  private convertDecimalToNumber(value: Decimal | number): number {
    if (value instanceof Decimal) {
      // Use exact value for calculations, not rounded
      return value.toNumber();
    }
    return Number(value);
  }

  async createOrUpdateBillCount(
    cashierId: string,
    createDto: CreateBillCountDto,
  ) {
    // Use timezone-aware date filtering
    const dateFilter = createManilaDateFilter(createDto.date);

    // Check if a bill count already exists for the specified day
    const existingBillCount = await this.prisma.billCount.findFirst({
      where: {
        cashierId,
        createdAt: dateFilter,
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
      // Create new bill count with timezone-aware date
      const targetDate = createDto.date
        ? new Date(`${createDto.date}T00:00:00+08:00`)
        : new Date();

      const billCount = await this.prisma.billCount.create({
        data: {
          cashierId,
          beginningBalance: createDto.beginningBalance || 0,
          showBeginningBalance: createDto.showBeginningBalance || false,
          createdAt: targetDate,
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

    if (billCount.cashierId) {
      // For cashier bill counts, use cashier ID
      return this.formatBillCountResponse(
        billCount,
        billCount.cashierId,
        targetDate,
        false,
      );
    } else if (billCount.userId) {
      // For user bill counts, use user ID
      return this.formatBillCountResponse(
        billCount,
        billCount.userId,
        targetDate,
        true,
      );
    } else {
      throw new Error('Bill count must have either cashierId or userId');
    }
  }

  async getBillCountForDate(cashierId: string, date?: string) {
    // Use timezone-aware date filtering
    const dateFilter = createManilaDateFilter(date);

    const billCount = await this.prisma.billCount.findFirst({
      where: {
        cashierId,
        createdAt: dateFilter,
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
    // Use timezone-aware date filtering
    const dateFilter = createManilaDateFilter(createDto.date);

    const existingBillCount = await this.prisma.billCount.findFirst({
      where: {
        userId,
        createdAt: dateFilter,
      },
      include: {
        Bills: true,
      },
    });

    if (existingBillCount) {
      return this.updateBillCount(existingBillCount.id, createDto);
    } else {
      // Create new bill count with timezone-aware date
      const targetDate = createDto.date
        ? new Date(`${createDto.date}T00:00:00+08:00`)
        : new Date();

      const billCount = await this.prisma.billCount.create({
        data: {
          userId,
          beginningBalance: createDto.beginningBalance || 0,
          showBeginningBalance: createDto.showBeginningBalance || false,
          createdAt: targetDate,
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
    // Use timezone-aware date filtering
    const dateFilter = createManilaDateFilter(date);

    const billCount = await this.prisma.billCount.findFirst({
      where: {
        userId,
        createdAt: dateFilter,
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
    const dateFilter = createManilaDateFilter(date);

    const billCounts = await this.prisma.billCount.findMany({
      where: {
        userId: { not: null },
        createdAt: dateFilter,
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
    const dateFilter = createManilaDateFilter(date);

    const billCounts = await this.prisma.billCount.findMany({
      where: {
        cashierId: { not: null },
        createdAt: dateFilter,
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
          billCount.cashierId,
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
    // Convert the stored UTC date back to Manila date
    // The stored date is Manila midnight stored as UTC (e.g., 2025-09-23T16:00:00.000Z = Sept 24 00:00 Manila)
    // We need to add 8 hours to get the correct Manila date
    const manilaDate = new Date(targetDateUTC.getTime() + 8 * 60 * 60 * 1000);
    const manilaDateString = manilaDate.toISOString().split('T')[0]; // Get YYYY-MM-DD
    const dateFilter = createManilaDateFilter(manilaDateString);

    console.log('Target date UTC:', targetDateUTC);
    console.log('Manila date string:', manilaDateString);
    console.log('Date filter for sales:', dateFilter);

    if (isUser) {
      const cashSales = await this.prisma.sale.findMany({
        where: {
          paymentMethod: PaymentMethod.CASH,
          cashier: {
            userId: ownerId,
          },
          createdAt: dateFilter,
        },
        include: {
          SaleItem: {
            include: {
              product: { select: { id: true, name: true } },
              SackPrice: {
                include: {
                  specialPrice: true,
                },
              },
              perKiloPrice: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      console.log('Found cash sales:', cashSales.length);

      // Check if any sale item has null price, if so revert to totalAmount calculation
      const hasNullPrice = cashSales.some((sale) =>
        sale.SaleItem.some((item) => item.price === null),
      );

      if (hasNullPrice) {
        const total = cashSales.reduce(
          (sum, sale) => sum + Number(sale.totalAmount),
          0,
        );
        return Math.round(total);
      }

      let total = 0;
      cashSales.forEach((sale) => {
        sale.SaleItem.forEach((item) => {
          let itemTotal = 0;

          if (item.price !== null && item.price !== undefined) {
            itemTotal = Number(item.price);
          } else if (item.perKiloPriceId && item.perKiloPrice) {
            itemTotal = Number(item.perKiloPrice.price) * Number(item.quantity);
          } else if (item.sackPriceId && item.SackPrice) {
            let unitPrice;
            if (item.isSpecialPrice && item.SackPrice.specialPrice) {
              unitPrice = Number(item.SackPrice.specialPrice.price);
            } else {
              unitPrice = Number(item.SackPrice.price);
            }
            itemTotal = unitPrice * Number(item.quantity);
          }

          if (item.isDiscounted && item.discountedPrice !== null) {
            itemTotal = Number(item.discountedPrice);
          }

          total += itemTotal;
        });
      });

      return Math.round(total);
    } else {
      const cashSales = await this.prisma.sale.findMany({
        where: {
          paymentMethod: PaymentMethod.CASH,
          cashierId: ownerId,
          createdAt: dateFilter,
        },
        include: {
          SaleItem: {
            include: {
              product: { select: { id: true, name: true } },
              SackPrice: {
                include: {
                  specialPrice: true,
                },
              },
              perKiloPrice: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      console.log('Found cash sales:', cashSales.length);

      // Check if any sale item has null price, if so revert to totalAmount calculation
      const hasNullPrice = cashSales.some((sale) =>
        sale.SaleItem.some((item) => item.price === null),
      );

      if (hasNullPrice) {
        const total = cashSales.reduce(
          (sum, sale) => sum + Number(sale.totalAmount),
          0,
        );
        return Math.round(total);
      }

      let total = 0;
      cashSales.forEach((sale) => {
        sale.SaleItem.forEach((item) => {
          let itemTotal = 0;

          if (item.price !== null && item.price !== undefined) {
            itemTotal = Number(item.price);
          } else if (item.perKiloPriceId && item.perKiloPrice) {
            itemTotal = Number(item.perKiloPrice.price) * Number(item.quantity);
          } else if (item.sackPriceId && item.SackPrice) {
            let unitPrice;
            if (item.isSpecialPrice && item.SackPrice.specialPrice) {
              unitPrice = Number(item.SackPrice.specialPrice.price);
            } else {
              unitPrice = Number(item.SackPrice.price);
            }
            itemTotal = unitPrice * Number(item.quantity);
          }

          if (item.isDiscounted && item.discountedPrice !== null) {
            itemTotal = Number(item.discountedPrice);
          }

          total += itemTotal;
        });
      });

      return Math.round(total);
    }
  }

  private async calculateTotalExpenses(
    ownerId: string,
    targetDateUTC: Date,
    isUser: boolean,
  ): Promise<number> {
    // Same fix for expenses - convert UTC date back to Manila date
    const manilaDate = new Date(targetDateUTC.getTime() + 8 * 60 * 60 * 1000);
    const manilaDateString = manilaDate.toISOString().split('T')[0]; // Get YYYY-MM-DD
    const dateFilter = createManilaDateFilter(manilaDateString);

    let expenseList;

    if (isUser) {
      expenseList = await this.prisma.expenseList.findFirst({
        where: {
          userId: ownerId,
          createdAt: dateFilter,
        },
        include: {
          ExpenseItems: true,
        },
      });
    } else {
      expenseList = await this.prisma.expenseList.findFirst({
        where: {
          cashierId: ownerId,
          createdAt: dateFilter,
        },
        include: {
          ExpenseItems: true,
        },
      });
    }

    if (!expenseList) return 0;

    const total = expenseList.ExpenseItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );
    return Math.round(total);
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
      date: formatDateForClient(billCount.createdAt),
      updatedAt: formatDateForClient(billCount.updatedAt),
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
        createdAt: formatDateForClient(bill.createdAt),
        updatedAt: formatDateForClient(bill.updatedAt),
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

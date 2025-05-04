import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBillCountDto } from './dto/create-bill-count.dto';
import { UpdateBillCountDto } from './dto/update-bill-count.dto';
import { BillType } from '@prisma/client';

@Injectable()
export class BillsService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateBillCount(userId: string, createDto: CreateBillCountDto) {
    const targetDate = createDto.date ? new Date(createDto.date) : new Date();

    // Set start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if a bill count already exists for the specified day
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
      // Update existing bill count
      return this.updateBillCount(existingBillCount.id, createDto);
    } else {
      // Create new bill count
      const billCount = await this.prisma.billCount.create({
        data: {
          userId,
          expenses: createDto.expenses || 0,
          showExpenses: createDto.showExpenses || false,
          beginningBalance: createDto.beginningBalance || 0,
          showBeginningBalance: createDto.showBeginningBalance || false,
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
        expenses:
          updateDto.expenses !== undefined ? updateDto.expenses : undefined,
        showExpenses:
          updateDto.showExpenses !== undefined
            ? updateDto.showExpenses
            : undefined,
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
      // Get existing bills
      // Delete existing bills
      await this.prisma.bills.deleteMany({
        where: { billCountId },
      });

      // Update existing bills or create new ones
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
      },
    });

    if (!billCount) {
      throw new NotFoundException(
        `Bill count with ID ${billCountId} not found`,
      );
    }

    return this.formatBillCountResponse(billCount);
  }

  async getBillCountForDate(userId: string, date?: string) {
    // Set default date to today if not provided
    const targetDate = date ? new Date(date) : new Date();

    // Set start and end of the target day
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
      return null; // Return null for non-existing bill count
    }

    return this.formatBillCountResponse(billCount);
  }

  // Helper method to format bill count response
  private formatBillCountResponse(billCount: any) {
    // Calculate total amount from all bills
    const billsTotal = billCount.Bills.reduce(
      (sum, bill) => sum + bill.amount * this.getBillValue(bill.type),
      0,
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

    return {
      id: billCount.id,
      date: billCount.createdAt,
      expenses: billCount.expenses,
      showExpenses: billCount.showExpenses,
      beginningBalance: billCount.beginningBalance,
      showBeginningBalance: billCount.showBeginningBalance,
      bills: billCount.Bills.map((bill) => ({
        id: bill.id,
        type: bill.type,
        amount: bill.amount,
        value: bill.amount * this.getBillValue(bill.type),
      })),
      billsByType,
      billsTotal,
      // Calculate total with expenses if showExpenses is true
      totalWithExpenses:
        billsTotal + (billCount.showExpenses ? billCount.expenses : 0),
      // Calculate final total with beginning balance if showBeginningBalance is true
      finalTotal:
        billsTotal +
        (billCount.showExpenses ? billCount.expenses : 0) -
        (billCount.showBeginningBalance ? billCount.beginningBalance : 0),
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

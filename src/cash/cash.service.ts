import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBillCountDto } from './dto/createBillCount.dto';
import { UpdateBillCountDto } from './dto/updateBillCount.dto';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllBillCounts(userId: string) {
    // Get all bill counts
    const billCounts = await this.prisma.billCount.findMany({
      where: { userId },
      include: {
        Bills: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by date (day only)
    const groupedByDay = billCounts.reduce((acc, billCount) => {
      // Extract date part only (YYYY-MM-DD)
      const dateKey = billCount.createdAt.toISOString().split('T')[0];

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(billCount);

      return acc;
    }, {});

    // Convert to array and maintain descending date order
    return Object.entries(groupedByDay)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, counts]) => ({
        date,
        counts,
      }));
  }

  async getBillCountByDate(userId: string, date: Date) {
    return this.prisma.billCount.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lte: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
      include: {
        Bills: true,
      },
    });
  }

  async getBillCountById(id: string) {
    return this.prisma.billCount.findUnique({
      where: { id },
      include: {
        Bills: true,
      },
    });
  }

  async createBillCount(
    userId: string,
    createBillCountDto: CreateBillCountDto,
  ) {
    const { bills, expenses, beginningBalance } = createBillCountDto;

    return this.prisma.billCount.create({
      data: {
        userId,
        expenses,
        beginningBalance,
        Bills: {
          create: bills.map((bill) => ({
            amount: bill.amount,
            type: bill.type,
          })),
        },
      },
    });
  }

  async updateBillCount(id: string, updateBillCountDto: UpdateBillCountDto) {
    const { bills, expenses, beginningBalance } = updateBillCountDto;

    return this.prisma.billCount.update({
      where: { id },
      data: {
        expenses,
        beginningBalance,
        Bills: {
          updateMany: bills.map((bill) => ({
            where: { id: bill.id },
            data: {
              amount: bill.amount,
              type: bill.type,
            },
          })),
        },
      },
    });
  }
}

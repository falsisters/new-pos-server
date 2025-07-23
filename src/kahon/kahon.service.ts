import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditKahonItemsDto } from './dto/editKahonItemsDto';
import {
  convertObjectDatesToManilaTime,
  convertArrayDatesToManilaTime,
  getManilaDateRangeForQuery,
} from '../utils/date.util';

@Injectable()
export class KahonService {
  constructor(private prisma: PrismaService) {}

  private formatKahon(kahon: any) {
    if (!kahon) return null;
    const formatted = {
      ...kahon,
      cashier: kahon.cashier
        ? convertObjectDatesToManilaTime(kahon.cashier)
        : null,
      KahonItems: kahon.KahonItems
        ? convertArrayDatesToManilaTime(kahon.KahonItems)
        : [],
      Sheets: kahon.Sheets
        ? convertArrayDatesToManilaTime(
            kahon.Sheets.map((sheet) => ({
              ...sheet,
              Rows: sheet.Rows
                ? convertArrayDatesToManilaTime(
                    sheet.Rows.map((row) => ({
                      ...row,
                      Cells: row.Cells
                        ? convertArrayDatesToManilaTime(row.Cells)
                        : [],
                    })),
                  )
                : [],
            })),
          )
        : [],
    };
    return convertObjectDatesToManilaTime(formatted);
  }

  async getKahonByCashier(cashierId: string, startDate?: Date, endDate?: Date) {
    // Use standardized date range query utility
    let startOfDay: Date, endOfDay: Date;

    if (startDate && endDate) {
      // Convert provided dates to proper query range
      const startRange = getManilaDateRangeForQuery(
        startDate.toISOString().split('T')[0],
      );
      const endRange = getManilaDateRangeForQuery(
        endDate.toISOString().split('T')[0],
      );
      startOfDay = startRange.startOfDay;
      endOfDay = endRange.endOfDay;
    } else {
      // Default to current day
      const currentRange = getManilaDateRangeForQuery();
      startOfDay = currentRange.startOfDay;
      endOfDay = currentRange.endOfDay;
    }

    // Assuming a cashier has one primary "Kahon" named 'Kahon'
    const result = await this.prisma.kahon.findFirst({
      where: {
        cashierId: cashierId,
        name: 'Kahon',
      },
      include: {
        cashier: {
          // Optional: include cashier details if needed
          select: {
            name: true,
            userId: true,
          },
        },
        KahonItems: {
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
        Sheets: {
          // Include sheets as well, if needed for the response
          include: {
            Rows: {
              orderBy: { rowIndex: 'asc' },
              include: {
                Cells: {
                  orderBy: { columnIndex: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    return this.formatKahon(result);
  }

  async getKahonsByUserId(userId: string, startDate?: Date, endDate?: Date) {
    // Use standardized date range query utility
    let startOfDay: Date, endOfDay: Date;

    if (startDate && endDate) {
      // Convert provided dates to proper query range
      const startRange = getManilaDateRangeForQuery(
        startDate.toISOString().split('T')[0],
      );
      const endRange = getManilaDateRangeForQuery(
        endDate.toISOString().split('T')[0],
      );
      startOfDay = startRange.startOfDay;
      endOfDay = endRange.endOfDay;
    } else {
      // Default to current day
      const currentRange = getManilaDateRangeForQuery();
      startOfDay = currentRange.startOfDay;
      endOfDay = currentRange.endOfDay;
    }

    const cashiers = await this.prisma.cashier.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    const kahonsWithCashierInfo = [];

    for (const cashier of cashiers) {
      const kahon = await this.prisma.kahon.findFirst({
        where: {
          cashierId: cashier.id,
          name: 'Kahon',
        },
        include: {
          KahonItems: {
            where: {
              createdAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          },
          Sheets: {
            include: {
              Rows: {
                where: {
                  createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                  },
                },
                orderBy: { rowIndex: 'asc' },
                include: {
                  Cells: {
                    orderBy: { columnIndex: 'asc' },
                  },
                },
              },
            },
          },
        },
      });
      if (kahon) {
        kahonsWithCashierInfo.push({
          cashierName: cashier.name,
          cashierId: cashier.id,
          ...this.formatKahon(kahon),
        });
      }
    }
    return kahonsWithCashierInfo;
  }

  async editKahonItems(id: string, editKahonItemsDto: EditKahonItemsDto) {
    const { kahonItems } = editKahonItemsDto;

    // Find the kahon first
    const kahon = await this.prisma.kahon.findUnique({
      where: { id },
      include: { KahonItems: true },
    });

    if (!kahon) {
      throw new Error('Kahon not found');
    }

    // Update each kahon item
    const updatePromises = kahonItems.map((item) => {
      return this.prisma.kahonItem.update({
        where: { id: item.id },
        data: {
          name: item.name,
          quantity: item.quantity,
        },
      });
    });

    const results = await Promise.all(updatePromises);
    return convertArrayDatesToManilaTime(results);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditKahonItemsDto } from './dto/editKahonItemsDto';
import {
  convertObjectDatesToManilaTime,
  convertArrayDatesToManilaTime,
  parseManilaDateRangeToUTC,
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
    // Convert Manila Time dates to proper UTC range
    let start: Date;
    let end: Date;

    if (startDate || endDate) {
      const dateRange = parseManilaDateRangeToUTC(
        startDate?.toISOString().split('T')[0],
        endDate?.toISOString().split('T')[0],
      );
      start = dateRange.startDate;
      end = dateRange.endDate;
    } else {
      // Default to today in Manila Time
      const dateRange = parseManilaDateRangeToUTC();
      start = dateRange.startDate;
      end = dateRange.endDate;
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
              gte: start,
              lte: end,
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
    // Convert Manila Time dates to proper UTC range
    let start: Date;
    let end: Date;

    if (startDate || endDate) {
      const dateRange = parseManilaDateRangeToUTC(
        startDate?.toISOString().split('T')[0],
        endDate?.toISOString().split('T')[0],
      );
      start = dateRange.startDate;
      end = dateRange.endDate;
    } else {
      // Default to today in Manila Time
      const dateRange = parseManilaDateRangeToUTC();
      start = dateRange.startDate;
      end = dateRange.endDate;
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
                gte: start,
                lte: end,
              },
            },
          },
          Sheets: {
            include: {
              Rows: {
                where: {
                  createdAt: {
                    gte: start,
                    lte: end,
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

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditKahonItemsDto } from './dto/editKahonItemsDto';
import {
  formatDateForClient,
  createManilaDateFilter,
} from '../utils/date.util';

@Injectable()
export class KahonService {
  constructor(private prisma: PrismaService) {}

  private formatKahon(kahon: any) {
    if (!kahon) return null;
    return {
      ...kahon,
      createdAt: formatDateForClient(kahon.createdAt),
      updatedAt: formatDateForClient(kahon.updatedAt),
      cashier: kahon.cashier
        ? {
            ...kahon.cashier,
            createdAt: formatDateForClient(kahon.cashier.createdAt),
            updatedAt: formatDateForClient(kahon.cashier.updatedAt),
          }
        : null,
      KahonItems: kahon.KahonItems
        ? kahon.KahonItems.map((item) => ({
            ...item,
            createdAt: formatDateForClient(item.createdAt),
            updatedAt: formatDateForClient(item.updatedAt),
          }))
        : [],
      Sheets: kahon.Sheets
        ? kahon.Sheets.map((sheet) => ({
            ...sheet,
            createdAt: formatDateForClient(sheet.createdAt),
            updatedAt: formatDateForClient(sheet.updatedAt),
            Rows: sheet.Rows
              ? sheet.Rows.map((row) => ({
                  ...row,
                  createdAt: formatDateForClient(row.createdAt),
                  updatedAt: formatDateForClient(row.updatedAt),
                  Cells: row.Cells
                    ? row.Cells.map((cell) => ({
                        ...cell,
                        createdAt: formatDateForClient(cell.createdAt),
                        updatedAt: formatDateForClient(cell.updatedAt),
                      }))
                    : [],
                }))
              : [],
          }))
        : [],
    };
  }

  async getKahonByCashier(cashierId: string, startDate?: Date, endDate?: Date) {
    // Use createManilaDateFilter for date filtering
    let dateFilter: any = {};

    if (startDate && endDate) {
      // Create date range filter for multiple days
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const startFilter = createManilaDateFilter(startDateStr);
      const endFilter = createManilaDateFilter(endDateStr);

      dateFilter = {
        gte: startFilter.gte,
        lte: endFilter.lte,
      };
    } else {
      // Default to current day
      dateFilter = createManilaDateFilter();
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
            createdAt: dateFilter,
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
    // Use createManilaDateFilter for date filtering
    let dateFilter: any = {};

    if (startDate && endDate) {
      // Create date range filter for multiple days
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const startFilter = createManilaDateFilter(startDateStr);
      const endFilter = createManilaDateFilter(endDateStr);

      dateFilter = {
        gte: startFilter.gte,
        lte: endFilter.lte,
      };
    } else {
      // Default to current day
      dateFilter = createManilaDateFilter();
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
              createdAt: dateFilter,
            },
          },
          Sheets: {
            include: {
              Rows: {
                where: {
                  createdAt: dateFilter,
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
    return results.map((result) => ({
      ...result,
      createdAt: formatDateForClient(result.createdAt),
      updatedAt: formatDateForClient(result.updatedAt),
    }));
  }
}

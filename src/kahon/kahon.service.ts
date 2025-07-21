import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditKahonItemsDto } from './dto/editKahonItemsDto';

@Injectable()
export class KahonService {
  constructor(private prisma: PrismaService) {}

  private formatKahon(kahon: any) {
    if (!kahon) return null;
    return {
      ...kahon,
      KahonItems: kahon.KahonItems
        ? kahon.KahonItems.map((item) => ({
            ...item,
          }))
        : [],
      Sheets: kahon.Sheets
        ? kahon.Sheets.map((sheet) => ({
            ...sheet,
            Rows: sheet.Rows
              ? sheet.Rows.map((row) => ({
                  ...row,
                  Cells: row.Cells
                    ? row.Cells.map((cell) => ({
                        ...cell,
                      }))
                    : [],
                }))
              : [],
          }))
        : [],
    };
  }

  async getKahonByCashier(cashierId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Assuming a cashier has one primary "Kahon" named 'Kahon'
    const result = await this.prisma.kahon.findFirst({
      where: {
        cashierId: cashierId, // Changed from userId
        name: 'Kahon', // Assuming we fetch the specific "Kahon"
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
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

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
                  // Filter rows by date if sheets are per day, or adjust as needed
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
    return results;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransferDeliveryDto } from './dto/transferDelivery.dto';
import { Kahon, KahonItem, SackType, Transfer } from '@prisma/client';
import { TransferProductDto } from './dto/transferProduct.dto';
import { EditTransferDto } from './dto/editTransfer.dto';
import { TransferFilterDto } from './dto/transferWithFilter.dto';
import {
  convertObjectDatesToManilaTime,
  convertArrayDatesToManilaTime,
} from '../utils/date.util';

@Injectable()
export class TransferService {
  constructor(private prisma: PrismaService) {}

  private formatTransfer(transfer: any) {
    if (!transfer) return null;
    return convertObjectDatesToManilaTime(transfer);
  }

  private formatTransfers(transfers: any[]) {
    return convertArrayDatesToManilaTime(transfers);
  }

  private parseSackType(type: SackType) {
    switch (type) {
      case 'FIFTY_KG':
        return '50KG';
      case 'TWENTY_FIVE_KG':
        return '25KG';
      case 'FIVE_KG':
        return '5KG';
    }
  }

  async getAllTransfers(userId: string) {
    const cashiers = await this.prisma.cashier.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    const cashierIds = cashiers.map((cashier) => cashier.id);

    const transfers = await this.prisma.transfer.findMany({
      where: {
        cashierId: {
          in: cashierIds,
        },
      },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
    });

    return this.formatTransfers(transfers);
  }

  async deleteTransfer(id: string) {
    const result = await this.prisma.transfer.delete({
      where: { id },
    });
    return this.formatTransfer(result);
  }

  async editTransfer(id: string, editTransferDto: EditTransferDto) {
    const { quantity, name, type } = editTransferDto;
    const result = await this.prisma.transfer.update({
      where: { id },
      data: {
        quantity,
        name,
        type,
      },
    });
    return this.formatTransfer(result);
  }

  async getTransfer(id: string) {
    const result = await this.prisma.transfer.findUnique({
      where: { id },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
    });
    return this.formatTransfer(result);
  }

  async transferDelivery(
    cashierId: string, // Changed from userId to cashierId
    transferDeliveryDto: TransferDeliveryDto,
  ) {
    const { name } = transferDeliveryDto;
    let selectedKahon: Kahon & { Sheets: any[] };
    const currentKahon = await this.prisma.kahon.findFirst({
      where: { cashierId, name: 'Kahon' }, // Changed from userId to cashierId
      include: { Sheets: true }, // Include sheets to check if any exist
    });

    if (!currentKahon) {
      // Create Kahon with a Kahon Sheet
      selectedKahon = await this.prisma.kahon.create({
        data: {
          name: 'Kahon',
          cashierId, // Changed from userId to cashierId
          Sheets: {
            create: {
              name: 'Kahon Sheet',
              columns: 5,
            },
          },
        },
        include: { Sheets: true },
      });
    } else {
      selectedKahon = currentKahon;
    }

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Create KahonItem
      const kahonItem = await tx.kahonItem.create({
        data: {
          name: `${name}`,
          quantity: 0,
          kahon: { connect: { id: selectedKahon.id } },
        },
      });

      // Get active sheet or create one if none exists
      const sheet =
        selectedKahon.Sheets.length > 0
          ? selectedKahon.Sheets[0]
          : await tx.sheet.create({
              data: {
                name: 'Kahon Sheet',
                columns: 5,
                kahon: { connect: { id: selectedKahon.id } },
              },
            });

      // Find max row index to determine where to add the new row
      const lastRow = await tx.row.findFirst({
        where: { sheetId: sheet.id },
        orderBy: { rowIndex: 'desc' },
      });

      const newRowIndex = lastRow ? lastRow.rowIndex + 1 : 0;

      // Create a row for this item
      const row = await tx.row.create({
        data: {
          rowIndex: newRowIndex,
          isItemRow: true,
          itemId: kahonItem.id,
          sheet: { connect: { id: sheet.id } },
        },
      });

      // Create cells for all columns in the sheet
      const cellsData = Array.from({ length: sheet.columns }, (_, i) => {
        if (i === 0) {
          // First column is quantity
          return {
            rowId: row.id,
            columnIndex: i,
            value: String(kahonItem.quantity),
            kahonItemId: kahonItem.id,
          };
        } else if (i === 1) {
          // Second column is name
          return {
            rowId: row.id,
            columnIndex: i,
            value: kahonItem.name,
            kahonItemId: kahonItem.id,
          };
        } else {
          // Rest of columns are empty
          return {
            rowId: row.id,
            columnIndex: i,
            value: '',
            kahonItemId: kahonItem.id,
          };
        }
      });

      await tx.cell.createMany({
        data: cellsData,
      });

      return kahonItem;
    });
  }

  async transferProduct(
    cashierId: string, // Remove userId parameter since we're using cashierId
    transferProductDto: TransferProductDto,
  ) {
    const { product } = transferProductDto;

    // Verify product belongs to cashier or is unassigned
    const currentProduct = await this.prisma.product.findFirst({
      where: {
        id: product.id,
        OR: [
          { cashierId }, // Product belongs to this cashier
          { cashierId: null }, // Unassigned product (migration period)
        ],
      },
    });

    if (!currentProduct) {
      throw new Error(
        `Product ${product.id} not found or not accessible by this cashier`,
      );
    }

    // If product is unassigned, assign it to this cashier
    if (!currentProduct.cashierId) {
      await this.prisma.product.update({
        where: { id: product.id },
        data: { cashierId },
      });
    }

    if (transferProductDto.transferType === 'KAHON') {
      let selectedKahon: Kahon & { Sheets: any[] };
      const currentKahon = await this.prisma.kahon.findFirst({
        where: { cashierId, name: 'Kahon' },
        include: { Sheets: true },
      });

      if (!currentKahon) {
        selectedKahon = await this.prisma.kahon.create({
          data: {
            name: 'Kahon',
            cashierId,
            Sheets: {
              create: {
                name: 'Kahon Sheet',
                columns: 5,
              },
            },
          },
          include: { Sheets: true },
        });
      } else {
        selectedKahon = currentKahon;
      }

      return this.prisma.$transaction(async (tx) => {
        // Update stock logic - products are now under the same cashier
        if (product.sackPrice) {
          await tx.sackPrice.update({
            where: { id: product.sackPrice.id },
            data: {
              stock: { decrement: product.sackPrice.quantity },
            },
          });
        }

        if (product.perKiloPrice) {
          await tx.perKiloPrice.update({
            where: { id: product.perKiloPrice.id },
            data: {
              stock: { decrement: product.perKiloPrice.quantity },
            },
          });
        }

        let kahonItem: KahonItem;
        const currentProduct = await tx.product.findUnique({
          where: { id: product.id },
        });

        // Get active sheet or create one if none exists
        const sheet =
          selectedKahon.Sheets.length > 0
            ? selectedKahon.Sheets[0]
            : await tx.sheet.create({
                data: {
                  name: 'Kahon Sheet',
                  columns: 5,
                  kahon: { connect: { id: selectedKahon.id } },
                },
              });

        // Find max row index
        const lastRow = await tx.row.findFirst({
          where: { sheetId: sheet.id },
          orderBy: { rowIndex: 'desc' },
        });

        const newRowIndex = lastRow ? lastRow.rowIndex + 1 : 0;

        if (currentProduct) {
          if (product.sackPrice) {
            // Create KahonItem for sack
            kahonItem = await tx.kahonItem.create({
              data: {
                kahonId: selectedKahon.id,
                quantity: product.sackPrice.quantity,
                name: `${currentProduct.name} ${this.parseSackType(product.sackPrice.type)}`,
              },
            });

            // Create row for this item
            const row = await tx.row.create({
              data: {
                rowIndex: newRowIndex,
                isItemRow: true,
                itemId: kahonItem.id,
                sheet: { connect: { id: sheet.id } },
              },
            });

            // Create cells for all columns in the sheet
            const cellsData = Array.from({ length: sheet.columns }, (_, i) => {
              if (i === 0) {
                // First column is quantity
                return {
                  rowId: row.id,
                  columnIndex: i,
                  value: String(kahonItem.quantity),
                  kahonItemId: kahonItem.id,
                };
              } else if (i === 1) {
                // Second column is name
                return {
                  rowId: row.id,
                  columnIndex: i,
                  value: kahonItem.name,
                  kahonItemId: kahonItem.id,
                };
              } else {
                // Rest of columns are empty
                return {
                  rowId: row.id,
                  columnIndex: i,
                  value: '',
                  kahonItemId: kahonItem.id,
                };
              }
            });

            await tx.cell.createMany({
              data: cellsData,
            });
          }

          if (product.perKiloPrice) {
            // Create KahonItem for per kilo
            kahonItem = await tx.kahonItem.create({
              data: {
                kahonId: selectedKahon.id,
                quantity: 0,
                name: `${currentProduct.name} ${product.perKiloPrice.quantity}KG`,
              },
            });

            // Create row for this item
            const row = await tx.row.create({
              data: {
                rowIndex: newRowIndex,
                isItemRow: true,
                itemId: kahonItem.id,
                sheet: { connect: { id: sheet.id } },
              },
            });

            // Create cells for all columns in the sheet
            const cellsData = Array.from({ length: sheet.columns }, (_, i) => {
              if (i === 0) {
                // First column is quantity
                return {
                  rowId: row.id,
                  columnIndex: i,
                  value: String(kahonItem.quantity),
                  kahonItemId: kahonItem.id,
                };
              } else if (i === 1) {
                // Second column is name
                return {
                  rowId: row.id,
                  columnIndex: i,
                  value: kahonItem.name,
                  kahonItemId: kahonItem.id,
                };
              } else {
                // Rest of columns are empty
                return {
                  rowId: row.id,
                  columnIndex: i,
                  value: '',
                  kahonItemId: kahonItem.id,
                };
              }
            });

            await tx.cell.createMany({
              data: cellsData,
            });
          }
        }

        return kahonItem;
      });
    } else {
      // Non-KAHON transfer logic remains unchanged
      return this.prisma.$transaction(async (tx) => {
        // Existing non-KAHON transfer logic
        if (product.sackPrice) {
          await tx.sackPrice.update({
            where: { id: product.sackPrice.id },
            data: {
              stock: { decrement: product.sackPrice.quantity },
            },
          });
        }

        if (product.perKiloPrice) {
          await tx.perKiloPrice.update({
            where: { id: product.perKiloPrice.id },
            data: {
              stock: { decrement: product.perKiloPrice.quantity },
            },
          });
        }

        let transfer: Transfer;
        const currentProduct = await tx.product.findUnique({
          where: { id: product.id },
        });

        if (currentProduct && product.sackPrice) {
          transfer = await tx.transfer.create({
            data: {
              name: `${currentProduct.name} ${this.parseSackType(product.sackPrice.type)}`,
              quantity: product.sackPrice.quantity,
              type: transferProductDto.transferType,
              cashier: { connect: { id: cashierId } },
            },
          });
        }

        if (currentProduct && product.perKiloPrice) {
          transfer = await tx.transfer.create({
            data: {
              name: `${currentProduct.name} ${product.perKiloPrice.quantity}KG`,
              quantity: 0,
              type: transferProductDto.transferType,
              cashier: { connect: { id: cashierId } },
            },
          });
        }

        return transfer;
      });
    }
  }

  async getAllTransfersWithFilter(userId: string, filters: TransferFilterDto) {
    // Set default date to today if not provided
    const targetDate = filters.date ? new Date(filters.date) : new Date();

    // Set start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const cashiers = await this.prisma.cashier.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    const cashierIds = cashiers.map((cashier) => cashier.id);

    const transfers = await this.prisma.transfer.findMany({
      where: {
        AND: [
          {
            cashierId: {
              in: cashierIds,
            },
          },
          {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        ],
      },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.formatTransfers(transfers);
  }

  async getAllTransfersByCashier(cashierId: string) {
    const transfers = await this.prisma.transfer.findMany({
      where: {
        cashierId,
      },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.formatTransfers(transfers);
  }

  async getAllTransfersWithFilterByCashier(
    cashierId: string,
    filters: TransferFilterDto,
  ) {
    // Set default date to today if not provided
    const targetDate = filters.date ? new Date(filters.date) : new Date();

    // Set start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const transfers = await this.prisma.transfer.findMany({
      where: {
        AND: [
          {
            cashierId,
          },
          {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        ],
      },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.formatTransfers(transfers);
  }

  async verifyCashierOwnership(userId: string, cashierId: string) {
    const cashier = await this.prisma.cashier.findFirst({
      where: {
        id: cashierId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!cashier) {
      throw new Error(
        'Cashier not found or you do not have permission to access it',
      );
    }

    return cashier;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransferDeliveryDto } from './dto/transferDelivery.dto';
import { Kahon, KahonItem, SackType, Transfer } from '@prisma/client';
import { TransferProductDto } from './dto/transferProduct.dto';
import { EditTransferDto } from './dto/editTransfer.dto';

@Injectable()
export class TransferService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.transfer.findMany({
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
  }

  async deleteTransfer(id: string) {
    return this.prisma.transfer.delete({
      where: { id },
    });
  }

  async editTransfer(id: string, editTransferDto: EditTransferDto) {
    const { quantity, name, type } = editTransferDto;
    return this.prisma.transfer.update({
      where: { id },
      data: {
        quantity,
        name,
        type,
      },
    });
  }

  async getTransfer(id: string) {
    return this.prisma.transfer.findUnique({
      where: { id },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async transferDelivery(
    cashierId: string,
    transferDeliveryDto: TransferDeliveryDto,
  ) {
    const { name } = transferDeliveryDto;
    let selectedKahon: Kahon & { Sheets: any[] };
    const currentKahon = await this.prisma.kahon.findUnique({
      where: { cashierId: cashierId },
      include: { Sheets: true }, // Include sheets to check if any exist
    });

    if (!currentKahon) {
      // Create Kahon with a default Sheet
      selectedKahon = await this.prisma.kahon.create({
        data: {
          name: 'Kahon',
          cashierId,
          Sheets: {
            create: {
              name: 'Default Sheet',
              columns: 10,
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
                name: 'Default Sheet',
                columns: 10,
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

      // Create the first two cells (quantity and name)
      await tx.cell.createMany({
        data: [
          {
            rowId: row.id,
            columnIndex: 0,
            value: String(kahonItem.quantity),
            kahonItemId: kahonItem.id,
          },
          {
            rowId: row.id,
            columnIndex: 1,
            value: kahonItem.name,
            kahonItemId: kahonItem.id,
          },
        ],
      });

      return kahonItem;
    });
  }

  async transferProduct(
    cashierId: string,
    transferProductDto: TransferProductDto,
  ) {
    const { product } = transferProductDto;

    if (transferProductDto.transferType === 'KAHON') {
      let selectedKahon: Kahon & { Sheets: any[] };
      const currentKahon = await this.prisma.kahon.findUnique({
        where: { cashierId: cashierId },
        include: { Sheets: true }, // Include sheets to check if any exist
      });

      if (!currentKahon) {
        selectedKahon = await this.prisma.kahon.create({
          data: {
            name: 'Kahon',
            cashierId,
            Sheets: {
              create: {
                name: 'Default Sheet',
                columns: 10,
              },
            },
          },
          include: { Sheets: true },
        });
      } else {
        selectedKahon = currentKahon;
      }

      return this.prisma.$transaction(async (tx) => {
        // Update stock logic
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
                  name: 'Default Sheet',
                  columns: 10,
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

            // Create row and cells for this item
            const row = await tx.row.create({
              data: {
                rowIndex: newRowIndex,
                isItemRow: true,
                itemId: kahonItem.id,
                sheet: { connect: { id: sheet.id } },
              },
            });

            // Create the first two cells (quantity and name)
            await tx.cell.createMany({
              data: [
                {
                  rowId: row.id,
                  columnIndex: 0,
                  value: String(kahonItem.quantity),
                  kahonItemId: kahonItem.id,
                },
                {
                  rowId: row.id,
                  columnIndex: 1,
                  value: kahonItem.name,
                  kahonItemId: kahonItem.id,
                },
              ],
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

            // Create row and cells for this item
            const row = await tx.row.create({
              data: {
                rowIndex: newRowIndex,
                isItemRow: true,
                itemId: kahonItem.id,
                sheet: { connect: { id: sheet.id } },
              },
            });

            // Create the first two cells (quantity and name)
            await tx.cell.createMany({
              data: [
                {
                  rowId: row.id,
                  columnIndex: 0,
                  value: String(kahonItem.quantity),
                  kahonItemId: kahonItem.id,
                },
                {
                  rowId: row.id,
                  columnIndex: 1,
                  value: kahonItem.name,
                  kahonItemId: kahonItem.id,
                },
              ],
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
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findInventoryByCashier(cashierId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { cashierId },
    });

    if (!inventory) {
      return this.prisma.inventory.create({
        data: {
          cashierId,
          name: 'Default Inventory',
          InventorySheet: {
            create: {
              name: 'Default Inventory Sheet',
              columns: 10,
            },
          },
        },
      });
    }
    return inventory;
  }

  async findInventorySheetByCashier(cashierId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { cashierId },
      include: {
        InventorySheet: {
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

    if (!inventory) {
      const inventory = this.prisma.inventory.create({
        data: {
          cashierId,
          name: 'Default Inventory',
          InventorySheet: {
            create: {
              name: 'Default Sheet',
              columns: 10,
            },
          },
        },
      });

      return inventory.InventorySheet[0];
    }

    if (inventory.InventorySheet.length === 0) {
      const inventorySheet = await this.createInventorySheet(
        inventory.id,
        'Default Sheet',
      );
      return inventorySheet;
    }

    return inventory.InventorySheet[0];
  }

  async createInventorySheet(
    inventoryId: string,
    name: string,
    columns: number = 10,
  ) {
    return await this.prisma.inventorySheet.create({
      data: {
        name,
        columns,
        inventory: { connect: { id: inventoryId } },
      },
    });
  }

  async getInventorySheetWithData(sheetId: string) {
    return await this.prisma.inventorySheet.findUnique({
      where: { id: sheetId },
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
    });
  }

  async getInventorySheetsByDateRange(
    inventoryId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // First get filtered InventoryItems
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        inventoryId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { id: true },
    });

    const itemIds = items.map((item) => item.id);

    // Then get rows that reference these items
    return await this.prisma.inventorySheet.findFirst({
      where: { inventoryId },
      include: {
        Rows: {
          where: {
            OR: [
              { itemId: { in: itemIds } }, // Get rows for filtered items
              { isItemRow: false }, // Also include calculation rows
            ],
          },
          include: {
            Cells: true,
          },
        },
      },
    });
  }

  async addItemRow(sheetId: string, inventoryItemId: string, rowIndex: number) {
    // Create a row for an item
    const row = await this.prisma.inventoryRow.create({
      data: {
        rowIndex,
        isItemRow: true,
        itemId: inventoryItemId,
        inventorySheet: { connect: { id: sheetId } },
      },
    });

    // Get the InventoryItem to prefill the first two cells
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    // Create the first two cells (quantity and name)
    await this.prisma.inventoryCell.createMany({
      data: [
        {
          inventoryRowId: row.id,
          columnIndex: 0,
          value: String(item.quantity),
        },
        {
          inventoryRowId: row.id,
          columnIndex: 1,
          value: item.name,
        },
      ],
    });

    return row;
  }

  async addCalculationRow(
    sheetId: string,
    rowIndex: number,
    description: string,
  ) {
    // Create a calculation row (totals, etc.)
    const row = await this.prisma.inventoryRow.create({
      data: {
        rowIndex,
        isItemRow: false,
        inventorySheet: { connect: { id: sheetId } },
      },
    });

    // Add a descriptive cell in the name column
    await this.prisma.inventoryCell.create({
      data: {
        inventoryRowId: row.id,
        columnIndex: 1,
        value: description,
      },
    });

    return row;
  }

  async deleteRow(rowId: string) {
    // Delete all cells in the row first
    await this.prisma.inventoryCell.deleteMany({
      where: { inventoryRowId: rowId },
    });

    return await this.prisma.inventoryRow.delete({
      where: { id: rowId },
    });
  }

  async updateCell(cellId: string, value: string, formula?: string) {
    return await this.prisma.inventoryCell.update({
      where: { id: cellId },
      data: {
        value,
        formula,
        isCalculated: !!formula,
      },
    });
  }

  async addCell(
    rowId: string,
    columnIndex: number,
    value: string,
    formula?: string,
  ) {
    return await this.prisma.inventoryCell.create({
      data: {
        inventoryRowId: rowId,
        columnIndex,
        value,
        formula,
        isCalculated: !!formula,
      },
    });
  }

  async deleteCell(cellId: string) {
    return await this.prisma.inventoryCell.delete({
      where: { id: cellId },
    });
  }

  // For batch updating all cells at once
  async updateCells(cells: { id: string; value: string; formula?: string }[]) {
    const updatePromises = cells.map((cell) => {
      return this.prisma.inventoryCell.update({
        where: { id: cell.id },
        data: {
          value: cell.value,
          formula: cell.formula,
          isCalculated: !!cell.formula,
        },
      });
    });

    return Promise.all(updatePromises);
  }
}

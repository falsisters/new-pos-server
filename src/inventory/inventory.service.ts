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
              columns: 15,
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
      const newInventory = await this.prisma.inventory.create({
        data: {
          cashierId,
          name: 'Default Inventory',
          InventorySheet: {
            create: {
              name: 'Default Sheet',
              columns: 15,
            },
          },
        },
        include: {
          InventorySheet: true,
        },
      });

      return newInventory.InventorySheet[0];
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
    cashierId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Set date range
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Find the inventory for this cashier
    let inventory = await this.prisma.inventory.findUnique({
      where: { cashierId },
    });

    if (!inventory) {
      // Create a new inventory if it doesn't exist
      inventory = await this.prisma.inventory.create({
        data: {
          cashierId,
          name: 'Default Inventory',
          InventorySheet: {
            create: {
              name: 'Default Inventory Sheet',
              columns: 15,
            },
          },
        },
      });
    }

    // Return sheets with rows filtered by date range
    return await this.prisma.inventorySheet.findFirst({
      where: { inventoryId: inventory.id },
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

    // Create the first two cells (quantity and name)
    await this.prisma.inventoryCell.createMany({
      data: [
        {
          inventoryRowId: row.id,
          columnIndex: 0,
        },
        {
          inventoryRowId: row.id,
          columnIndex: 1,
        },
      ],
    });

    return row;
  }

  async addCalculationRow(
    sheetId: string,
    rowIndex: number,
    description: string = '',
  ) {
    // Get the sheet to determine the number of columns
    const sheet = await this.prisma.inventorySheet.findUnique({
      where: { id: sheetId },
      select: { columns: true },
    });

    if (!sheet) {
      throw new Error('Inventory sheet not found');
    }

    // Create a calculation row (totals, etc.)
    const row = await this.prisma.inventoryRow.create({
      data: {
        rowIndex,
        isItemRow: false,
        inventorySheet: { connect: { id: sheetId } },
      },
    });

    // Create cells for all columns in the sheet
    const cellsData = Array.from({ length: sheet.columns }, (_, i) => ({
      inventoryRowId: row.id,
      columnIndex: i,
      // If this is column 1 (index 1), set the description, otherwise empty value
      value: i === 1 ? description : '',
    }));

    await this.prisma.inventoryCell.createMany({
      data: cellsData,
    });

    return row;
  }

  async deleteRow(rowId: string) {
    // Delete all cells in the row first
    await this.prisma.inventoryCell.deleteMany({
      where: { inventoryRowId: rowId },
    });

    // Then delete the row itself
    return await this.prisma.inventoryRow.delete({
      where: { id: rowId },
    });
  }

  async updateCell(
    cellId: string,
    value: string,
    formula?: string,
    color?: string,
  ) {
    return await this.prisma.inventoryCell.update({
      where: { id: cellId },
      data: {
        value,
        formula,
        color: color ? color : undefined,
        isCalculated: !!formula,
      },
    });
  }

  async deleteCell(cellId: string) {
    return await this.prisma.inventoryCell.delete({
      where: { id: cellId },
    });
  }

  async addCells(
    cells: {
      rowId: string;
      columnIndex: number;
      value: string;
      color?: string;
      formula?: string;
    }[],
  ) {
    const addCellsPromises = cells.map((cell) => {
      return this.prisma.inventoryCell.create({
        data: {
          inventoryRowId: cell.rowId,
          columnIndex: cell.columnIndex,
          value: cell.value,
          color: cell.color ? cell.color : undefined,
          formula: cell.formula,
          isCalculated: !!cell.formula,
        },
      });
    });

    return Promise.all(addCellsPromises);
  }

  async addCell(
    rowId: string,
    columnIndex: number,
    value: string,
    color?: string,
    formula?: string,
  ) {
    return await this.prisma.inventoryCell.create({
      data: {
        inventoryRowId: rowId,
        columnIndex,
        value,
        color: color ? color : undefined,
        formula,
        isCalculated: !!formula,
      },
    });
  }

  // For batch updating all cells at once
  async updateCells(
    cells: { id: string; value: string; color?: string; formula?: string }[],
  ) {
    const updatePromises = cells.map((cell) => {
      return this.prisma.inventoryCell.update({
        where: { id: cell.id },
        data: {
          value: cell.value,
          color: cell.color ? cell.color : undefined,
          formula: cell.formula,
          isCalculated: !!cell.formula,
        },
      });
    });

    return Promise.all(updatePromises);
  }
}

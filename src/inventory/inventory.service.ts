import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findInventoryByCashier(cashierId: string, name: string = 'Inventory') {
    // Added name parameter
    const inventory = await this.prisma.inventory.findFirst({
      where: { cashierId, name }, // Changed userId to cashierId
    });

    if (!inventory) {
      return this.prisma.inventory.create({
        data: {
          cashierId, // Changed userId to cashierId
          name,
          InventorySheet: {
            create: {
              name: `${name} Sheet`,
              columns: 20, // Or your default
            },
          },
        },
      });
    }
    return inventory;
  }

  async findInventorySheetByCashier(cashierId: string) {
    // For 'Inventory'
    const inventory = await this.prisma.inventory.findFirst({
      where: { cashierId, name: 'Inventory' }, // Changed userId to cashierId
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
          cashierId, // Changed userId to cashierId
          name: 'Inventory',
          InventorySheet: {
            create: {
              name: 'Inventory Sheet',
              columns: 20,
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
        'Expenses Sheet',
      );
      return inventorySheet;
    }

    return inventory.InventorySheet[0];
  }

  async findExpensesSheetByCashier(cashierId: string) {
    // For 'Expenses'
    const expenses = await this.prisma.inventory.findFirst({
      where: { cashierId, name: 'Expenses' }, // Changed userId to cashierId
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

    if (!expenses) {
      const newExpenses = await this.prisma.inventory.create({
        data: {
          cashierId, // Changed userId to cashierId
          name: 'Expenses',
          InventorySheet: {
            create: {
              name: 'Expenses Sheet',
              columns: 20,
            },
          },
        },
        include: {
          InventorySheet: true,
        },
      });

      return newExpenses.InventorySheet[0];
    }

    if (expenses.InventorySheet.length === 0) {
      const expensesSheet = await this.createInventorySheet(
        expenses.id,
        'Expenses Sheet',
      );
      return expensesSheet;
    }

    return expenses.InventorySheet[0];
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

  async getExpensesSheetsByDateRange(
    cashierId: string, // Changed userId to cashierId
    startDate?: Date,
    endDate?: Date,
  ) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

    let inventory = await this.prisma.inventory.findFirst({
      where: { cashierId, name: 'Expenses' }, // Changed userId to cashierId
    });

    if (!inventory) {
      inventory = await this.prisma.inventory.create({
        data: {
          cashierId, // Changed userId to cashierId
          name: 'Expenses',
          InventorySheet: {
            create: {
              name: 'Expenses Sheet',
              columns: 20,
            },
          },
        },
      });
    }

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

  async getInventorySheetsByDateRange(
    cashierId: string, // Changed userId to cashierId
    startDate?: Date,
    endDate?: Date,
  ) {
    // Set date range
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Find the inventory for this cashier
    let inventory = await this.prisma.inventory.findFirst({
      where: { cashierId, name: 'Inventory' }, // Changed userId to cashierId
    });

    if (!inventory) {
      // Create a new inventory if it doesn't exist
      inventory = await this.prisma.inventory.create({
        data: {
          cashierId, // Changed userId to cashierId
          name: 'Inventory',
          InventorySheet: {
            create: {
              name: 'Inventory Sheet',
              columns: 20,
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
    sheetId?: string,
    rowIndex?: number,
    description: string = '',
    inventoryId?: string,
  ) {
    let targetSheetId = sheetId;

    // If sheetId is not provided but inventoryId is, find the sheet
    if (!targetSheetId && inventoryId) {
      const inventory = await this.prisma.inventory.findUnique({
        where: { id: inventoryId },
        include: {
          InventorySheet: {
            select: { id: true },
          },
        },
      });

      if (!inventory) {
        throw new Error('Inventory not found');
      }

      if (inventory.InventorySheet.length === 0) {
        // Create a new sheet if none exists
        const newSheet = await this.createInventorySheet(
          inventoryId,
          'Inventory Sheet',
        );
        targetSheetId = newSheet.id;
      } else {
        targetSheetId = inventory.InventorySheet[0].id;
      }
    }

    if (!targetSheetId) {
      throw new Error('Neither sheetId nor inventoryId provided');
    }

    // Get the sheet to determine the number of columns
    const sheet = await this.prisma.inventorySheet.findUnique({
      where: { id: targetSheetId },
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
        inventorySheet: { connect: { id: targetSheetId } },
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
    rowIndex?: number,
  ) {
    // If rowIndex is provided, update the row first
    if (rowIndex !== undefined) {
      const cell = await this.prisma.inventoryCell.findUnique({
        where: { id: cellId },
        select: { inventoryRowId: true },
      });

      if (cell) {
        await this.prisma.inventoryRow.update({
          where: { id: cell.inventoryRowId },
          data: { rowIndex },
        });
      }
    }

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

  async addCell(
    rowId: string,
    columnIndex: number,
    value: string,
    formula?: string,
    color?: string,
  ) {
    return await this.prisma.inventoryCell.create({
      data: {
        inventoryRowId: rowId,
        columnIndex,
        value,
        formula,
        color: color ? color : undefined,
        isCalculated: !!formula,
      },
    });
  }

  async addCells(
    cells: {
      rowId: string;
      columnIndex: number;
      value: string;
      formula?: string;
      color?: string;
    }[],
  ) {
    const cellsData = cells.map((cell) => ({
      inventoryRowId: cell.rowId,
      columnIndex: cell.columnIndex,
      value: cell.value,
      formula: cell.formula,
      color: cell.color ? cell.color : undefined,
      isCalculated: !!cell.formula,
    }));

    return await this.prisma.inventoryCell.createMany({
      data: cellsData,
    });
  }

  async deleteCell(cellId: string) {
    return await this.prisma.inventoryCell.delete({
      where: { id: cellId },
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

  async getInventorySheetsForUserByDateRange(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const cashiers = await this.prisma.cashier.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    const resultSheets = [];
    for (const cashier of cashiers) {
      const sheet = await this.getInventorySheetsByDateRange(
        cashier.id,
        startDate,
        endDate,
      );
      if (sheet) {
        resultSheets.push({
          cashierName: cashier.name,
          cashierId: cashier.id,
          sheet,
        });
      }
    }
    return resultSheets;
  }

  async getExpensesSheetsForUserByDateRange(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const cashiers = await this.prisma.cashier.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    const resultSheets = [];
    for (const cashier of cashiers) {
      const sheet = await this.getExpensesSheetsByDateRange(
        cashier.id,
        startDate,
        endDate,
      );
      if (sheet) {
        resultSheets.push({
          cashierName: cashier.name,
          cashierId: cashier.id,
          sheet,
        });
      }
    }
    return resultSheets;
  }

  async updateRowPosition(rowId: string, newRowIndex: number) {
    return await this.prisma.inventoryRow.update({
      where: { id: rowId },
      data: { rowIndex: newRowIndex },
    });
  }
}

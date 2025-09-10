import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  formatDateForClient,
  createManilaDateFilter,
} from '../utils/date.util';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private formatInventorySheet(sheet: any) {
    if (!sheet) return null;
    return {
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
    };
  }

  private formatInventory(inventory: any) {
    if (!inventory) return null;
    return {
      ...inventory,
      createdAt: formatDateForClient(inventory.createdAt),
      updatedAt: formatDateForClient(inventory.updatedAt),
      InventorySheet: inventory.InventorySheet
        ? inventory.InventorySheet.map((sheet) =>
            this.formatInventorySheet(sheet),
          )
        : [],
    };
  }

  async findInventoryByCashier(cashierId: string, name: string = 'Inventory') {
    // Added name parameter
    const inventory = await this.prisma.inventory.findFirst({
      where: { cashierId, name }, // Changed userId to cashierId
    });

    const result =
      inventory ||
      (await this.prisma.inventory.create({
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
      }));

    return this.formatInventory(result);
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

    const result =
      inventory?.InventorySheet[0] ||
      (await this.createInventorySheet(inventory.id, 'Expenses Sheet'));

    return this.formatInventorySheet(result);
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

    const result =
      expenses?.InventorySheet[0] ||
      (await this.createInventorySheet(expenses.id, 'Expenses Sheet'));

    return this.formatInventorySheet(result);
  }

  async createInventorySheet(
    inventoryId: string,
    name: string,
    columns: number = 10,
  ) {
    const result = await this.prisma.inventorySheet.create({
      data: {
        name,
        columns,
        inventory: { connect: { id: inventoryId } },
      },
    });
    return {
      ...result,
      createdAt: formatDateForClient(result.createdAt),
      updatedAt: formatDateForClient(result.updatedAt),
    };
  }

  async getInventorySheetWithData(sheetId: string) {
    const result = await this.prisma.inventorySheet.findUnique({
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
    return this.formatInventorySheet(result);
  }

  async getExpensesSheetsByDateRange(
    cashierId: string, // Changed userId to cashierId
    startDate?: Date,
    endDate?: Date,
  ) {
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

    let inventory = await this.prisma.inventory.findFirst({
      where: { cashierId, name: 'Expenses' },
    });

    if (!inventory) {
      inventory = await this.prisma.inventory.create({
        data: {
          cashierId,
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

    const result = await this.prisma.inventorySheet.findFirst({
      where: { inventoryId: inventory.id },
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
    });

    return this.formatInventorySheet(result);
  }

  async getInventorySheetsByDateRange(
    cashierId: string, // Changed userId to cashierId
    startDate?: Date,
    endDate?: Date,
  ) {
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

    // Find the inventory for this cashier
    let inventory = await this.prisma.inventory.findFirst({
      where: { cashierId, name: 'Inventory' },
    });

    if (!inventory) {
      // Create a new inventory if it doesn't exist
      inventory = await this.prisma.inventory.create({
        data: {
          cashierId,
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

    const result = await this.prisma.inventorySheet.findFirst({
      where: { inventoryId: inventory.id },
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
    });

    return this.formatInventorySheet(result);
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

    return {
      ...row,
      createdAt: formatDateForClient(row.createdAt),
      updatedAt: formatDateForClient(row.updatedAt),
    };
  }

  async addCalculationRow(
    sheetId?: string,
    rowIndex?: number,
    description: string = '',
    inventoryId?: string,
    date?: Date,
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

    // Prepare creation data with optional date
    const createData: any = {
      rowIndex,
      isItemRow: false,
      inventorySheet: { connect: { id: targetSheetId } },
    };

    // Set createdAt if date is provided
    if (date) {
      createData.createdAt = date;
    }

    // Create a calculation row (totals, etc.)
    const row = await this.prisma.inventoryRow.create({
      data: createData,
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

    return {
      ...row,
      createdAt: formatDateForClient(row.createdAt),
      updatedAt: formatDateForClient(row.updatedAt),
    };
  }

  async deleteRow(rowId: string) {
    // Delete all cells in the row first
    await this.prisma.inventoryCell.deleteMany({
      where: { inventoryRowId: rowId },
    });

    // Then delete the row itself
    const result = await this.prisma.inventoryRow.delete({
      where: { id: rowId },
    });

    return {
      ...result,
      createdAt: formatDateForClient(result.createdAt),
      updatedAt: formatDateForClient(result.updatedAt),
    };
  }

  async updateCell(
    cellId: string,
    value: string,
    formula?: string | null,
    color?: string,
    rowIndex?: number,
  ) {
    console.log('InventoryService updateCell called with:', {
      cellId,
      value,
      formula,
      color,
      rowIndex,
    });

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

    // Build update data more explicitly
    const updateData: any = {
      value: value || '',
    };

    // Handle formula field explicitly - always set it to ensure it's updated
    if (formula === null || formula === undefined || formula === '') {
      updateData.formula = null;
      updateData.isCalculated = false;
    } else {
      updateData.formula = formula;
      updateData.isCalculated = true;
    }

    // Handle color field explicitly
    if (color === null || color === undefined || color === '') {
      updateData.color = null;
    } else {
      updateData.color = color;
    }

    console.log('Updating inventory cell with data:', updateData);

    const result = await this.prisma.inventoryCell.update({
      where: { id: cellId },
      data: updateData,
    });

    console.log('Inventory cell updated successfully:', result);
    return {
      ...result,
      createdAt: formatDateForClient(result.createdAt),
      updatedAt: formatDateForClient(result.updatedAt),
    };
  }

  async addCell(
    rowId: string,
    columnIndex: number,
    value: string,
    formula?: string | null,
    color?: string,
  ) {
    console.log('InventoryService addCell called with:', {
      rowId,
      columnIndex,
      value,
      formula,
      color,
    });

    // Build create data more explicitly
    const createData: any = {
      inventoryRowId: rowId,
      columnIndex: columnIndex,
      value: value || '',
    };

    // Handle formula field explicitly
    if (formula === null || formula === undefined || formula === '') {
      createData.formula = null;
      createData.isCalculated = false;
    } else {
      createData.formula = formula;
      createData.isCalculated = true;
    }

    // Handle color field explicitly
    if (color === null || color === undefined || color === '') {
      createData.color = null;
    } else {
      createData.color = color;
    }

    console.log('Creating inventory cell with data:', createData);

    const result = await this.prisma.inventoryCell.create({
      data: createData,
    });

    console.log('Inventory cell created successfully:', result);
    return {
      ...result,
      createdAt: formatDateForClient(result.createdAt),
      updatedAt: formatDateForClient(result.updatedAt),
    };
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

    const results = await this.prisma.inventoryCell.createMany({
      data: cellsData,
    });

    return results; // createMany returns count, not actual records
  }

  async deleteCell(cellId: string) {
    const result = await this.prisma.inventoryCell.delete({
      where: { id: cellId },
    });
    return {
      ...result,
      createdAt: formatDateForClient(result.createdAt),
      updatedAt: formatDateForClient(result.updatedAt),
    };
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

    const results = await Promise.all(updatePromises);
    return results.map((result) => ({
      ...result,
      createdAt: formatDateForClient(result.createdAt),
      updatedAt: formatDateForClient(result.updatedAt),
    }));
  }

  async updateRowPosition(rowId: string, newRowIndex: number) {
    const result = await this.prisma.inventoryRow.update({
      where: { id: rowId },
      data: { rowIndex: newRowIndex },
    });
    return {
      ...result,
      createdAt: formatDateForClient(result.createdAt),
      updatedAt: formatDateForClient(result.updatedAt),
    };
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

  async getExpensesSheetsByOneDate(cashierId: string, date?: Date) {
    // Use createManilaDateFilter for single date
    let dateFilter: any = {};

    if (date) {
      // Convert provided date to date string and use createManilaDateFilter
      const dateString = date.toISOString().split('T')[0];
      dateFilter = createManilaDateFilter(dateString);
    } else {
      // Default to current day
      dateFilter = createManilaDateFilter();
    }

    let inventory = await this.prisma.inventory.findFirst({
      where: { cashierId, name: 'Expenses' },
    });

    if (!inventory) {
      inventory = await this.prisma.inventory.create({
        data: {
          cashierId,
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

    const result = await this.prisma.inventorySheet.findFirst({
      where: { inventoryId: inventory.id },
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
    });

    return this.formatInventorySheet(result);
  }

  async getInventorySheetsByOneDate(cashierId: string, date?: Date) {
    // Use createManilaDateFilter for single date
    let dateFilter: any = {};

    if (date) {
      // Convert provided date to date string and use createManilaDateFilter
      const dateString = date.toISOString().split('T')[0];
      dateFilter = createManilaDateFilter(dateString);
    } else {
      // Default to current day
      dateFilter = createManilaDateFilter();
    }

    // Find the inventory for this cashier
    let inventory = await this.prisma.inventory.findFirst({
      where: { cashierId, name: 'Inventory' },
    });

    if (!inventory) {
      // Create a new inventory if it doesn't exist
      inventory = await this.prisma.inventory.create({
        data: {
          cashierId,
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

    const result = await this.prisma.inventorySheet.findFirst({
      where: { inventoryId: inventory.id },
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
    });

    return this.formatInventorySheet(result);
  }

  async getExpensesSheetsForUserByOneDate(userId: string, date?: Date) {
    const cashiers = await this.prisma.cashier.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    const resultSheets = [];
    for (const cashier of cashiers) {
      const sheet = await this.getExpensesSheetsByOneDate(cashier.id, date);
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

  async getInventorySheetsForUserByOneDate(userId: string, date?: Date) {
    const cashiers = await this.prisma.cashier.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    const resultSheets = [];
    for (const cashier of cashiers) {
      const sheet = await this.getInventorySheetsByOneDate(cashier.id, date);
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

  async validateRowMappings(
    mappings: { rowId: string; oldRowIndex: number; newRowIndex: number }[],
    sheetId: string,
  ) {
    const errors: string[] = [];
    const newIndices = mappings.map((m) => m.newRowIndex);

    // Check for duplicate new indices
    const duplicates = newIndices.filter(
      (index, pos) => newIndices.indexOf(index) !== pos,
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate row indices: ${duplicates.join(', ')}`);
    }

    // Check if all mappings belong to the same sheet
    const sheet = await this.prisma.inventorySheet.findUnique({
      where: { id: sheetId },
      include: {
        Rows: {
          select: { id: true, rowIndex: true },
        },
      },
    });

    if (!sheet) {
      errors.push('Sheet not found');
      return { isValid: false, errors };
    }

    // Validate that all row IDs exist in the sheet
    const sheetRowIds = sheet.Rows.map((r) => r.id);
    const invalidRowIds = mappings
      .map((m) => m.rowId)
      .filter((id) => !sheetRowIds.includes(id));

    if (invalidRowIds.length > 0) {
      errors.push(`Invalid row IDs: ${invalidRowIds.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async batchUpdateRowPositions(
    mappings: { rowId: string; oldRowIndex: number; newRowIndex: number }[],
  ) {
    const updatePromises = mappings.map((mapping) => {
      return this.prisma.inventoryRow.update({
        where: { id: mapping.rowId },
        data: { rowIndex: mapping.newRowIndex },
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

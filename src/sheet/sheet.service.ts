import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SheetService {
  constructor(private prisma: PrismaService) {}

  async createSheet(kahonId: string, name: string, columns: number = 10) {
    return await this.prisma.sheet.create({
      data: {
        name,
        columns,
        kahon: { connect: { id: kahonId } },
      },
    });
  }

  async getSheetWithData(sheetId: string) {
    return await this.prisma.sheet.findUnique({
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

  async getSheetsByDateRange(
    cashierId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Set date range
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Find the kahon for this cashier
    const kahon = await this.prisma.kahon.findFirst({
      where: { cashierId, name: 'Kahon' },
    });

    if (!kahon) {
      return null; // Or throw an error, or return an empty structure
    }

    // Return sheets with rows filtered by date range
    return await this.prisma.sheet.findFirst({
      where: { kahonId: kahon.id },
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

  async getSheetsForUserByDateRange(
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
      const sheet = await this.getSheetsByDateRange(
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

  async addItemRow(sheetId: string, kahonItemId: string, rowIndex: number) {
    // Get the sheet to determine the number of columns
    const sheet = await this.prisma.sheet.findUnique({
      where: { id: sheetId },
      select: { columns: true },
    });

    // Create a row for an item
    const row = await this.prisma.row.create({
      data: {
        rowIndex,
        isItemRow: true,
        itemId: kahonItemId,
        sheet: { connect: { id: sheetId } },
      },
    });

    // Get the KahonItem to prefill the first two cells
    const item = await this.prisma.kahonItem.findUnique({
      where: { id: kahonItemId },
    });

    // Create cells for all columns
    const cellsData = Array.from({ length: sheet.columns }, (_, i) => {
      // Special handling for first two columns
      if (i === 0) {
        return {
          rowId: row.id,
          columnIndex: i,
          value: String(item.quantity),
          kahonItemId: item.id,
        };
      } else if (i === 1) {
        return {
          rowId: row.id,
          columnIndex: i,
          value: item.name,
          kahonItemId: item.id,
        };
      } else {
        return {
          rowId: row.id,
          columnIndex: i,
          value: '',
        };
      }
    });

    await this.prisma.cell.createMany({
      data: cellsData,
    });

    return row;
  }

  async addCalculationRow(
    sheetId: string,
    rowIndex: number,
    description: string = '',
  ) {
    // Get the sheet to determine the number of columns
    const sheet = await this.prisma.sheet.findUnique({
      where: { id: sheetId },
      select: { columns: true },
    });

    // Create a calculation row (totals, etc.)
    const row = await this.prisma.row.create({
      data: {
        rowIndex,
        isItemRow: false,
        sheet: { connect: { id: sheetId } },
      },
    });

    // Create cells for all columns
    const cellsData = Array.from({ length: sheet.columns }, (_, i) => {
      if (i === 1) {
        // Add description in the name column
        return {
          rowId: row.id,
          columnIndex: i,
          value: description,
        };
      } else {
        return {
          rowId: row.id,
          columnIndex: i,
          value: '',
        };
      }
    });

    await this.prisma.cell.createMany({
      data: cellsData,
    });

    return row;
  }

  async deleteRow(rowId: string) {
    // Delete all cells in the row first
    await this.prisma.cell.deleteMany({
      where: { rowId },
    });

    // Then delete the row itself
    return await this.prisma.row.delete({
      where: { id: rowId },
    });
  }

  async updateCell(
    cellId: string,
    value: string,
    formula?: string | null,
    color?: string,
    rowIndex?: number,
  ) {
    console.log('SheetService updateCell called with:', {
      cellId,
      value,
      formula,
      color,
      rowIndex,
    });

    // If rowIndex is provided, update the row first
    if (rowIndex !== undefined) {
      const cell = await this.prisma.cell.findUnique({
        where: { id: cellId },
        select: { rowId: true },
      });

      if (cell) {
        await this.prisma.row.update({
          where: { id: cell.rowId },
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

    console.log('Updating cell with data:', updateData);

    const result = await this.prisma.cell.update({
      where: { id: cellId },
      data: updateData,
    });

    console.log('Cell updated successfully:', result);
    return result;
  }

  async deleteCell(cellId: string) {
    return await this.prisma.cell.delete({
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
      return this.prisma.cell.create({
        data: {
          rowId: cell.rowId,
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
    formula?: string | null,
    color?: string,
  ) {
    console.log('SheetService addCell called with:', {
      rowId,
      columnIndex,
      value,
      formula,
      color,
    });

    // Build create data more explicitly
    const createData: any = {
      rowId: rowId,
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

    console.log('Creating cell with data:', createData);

    const result = await this.prisma.cell.create({
      data: createData,
    });

    console.log('Cell created successfully:', result);
    return result;
  }

  // For batch updating all cells at once
  async updateCells(
    cells: { id: string; color?: string; value: string; formula?: string }[],
  ) {
    const updatePromises = cells.map((cell) => {
      return this.prisma.cell.update({
        where: { id: cell.id },
        data: {
          value: cell.value,
          formula: cell.formula,
          color: cell.color ? cell.color : undefined,
          isCalculated: !!cell.formula,
        },
      });
    });

    return Promise.all(updatePromises);
  }

  async updateRowPosition(rowId: string, newRowIndex: number) {
    return await this.prisma.row.update({
      where: { id: rowId },
      data: { rowIndex: newRowIndex },
    });
  }
}

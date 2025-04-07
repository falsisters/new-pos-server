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
    const kahon = await this.prisma.kahon.findUnique({
      where: { cashierId },
    });

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

  async updateCell(cellId: string, value: string, formula?: string) {
    return await this.prisma.cell.update({
      where: { id: cellId },
      data: {
        value,
        formula,
        isCalculated: !!formula,
      },
    });
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
      formula?: string;
    }[],
  ) {
    const addCellsPromises = cells.map((cell) => {
      return this.prisma.cell.create({
        data: {
          rowId: cell.rowId,
          columnIndex: cell.columnIndex,
          value: cell.value,
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
    formula?: string,
  ) {
    return await this.prisma.cell.create({
      data: {
        rowId,
        columnIndex,
        value,
        formula,
        isCalculated: !!formula,
      },
    });
  }

  // For batch updating all cells at once
  async updateCells(cells: { id: string; value: string; formula?: string }[]) {
    const updatePromises = cells.map((cell) => {
      return this.prisma.cell.update({
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

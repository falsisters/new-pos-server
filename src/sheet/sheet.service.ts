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
    // First get filtered KahonItems
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

    const kahon = await this.prisma.kahon.findUnique({
      where: { cashierId },
    });

    const items = await this.prisma.kahonItem.findMany({
      where: {
        kahonId: kahon.id,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: { id: true },
    });

    const itemIds = items.map((item) => item.id);

    // Then get rows that reference these items
    return await this.prisma.sheet.findFirst({
      where: { kahonId: kahon.id },
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

  async addItemRow(sheetId: string, kahonItemId: string, rowIndex: number) {
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

    // Create the first two cells (quantity and name)
    await this.prisma.cell.createMany({
      data: [
        {
          rowId: row.id,
          columnIndex: 0,
          value: String(item.quantity),
          kahonItemId: item.id,
        },
        {
          rowId: row.id,
          columnIndex: 1,
          value: item.name,
          kahonItemId: item.id,
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
    // Create a calculation row (totals, etc.)
    const row = await this.prisma.row.create({
      data: {
        rowIndex,
        isItemRow: false,
        sheet: { connect: { id: sheetId } },
      },
    });

    // Add a descriptive cell in the name column
    await this.prisma.cell.create({
      data: {
        rowId: row.id,
        columnIndex: 1,
        value: description,
      },
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

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

  // New method for batch row position updates with validation
  async batchUpdateRowPositions(
    updates: { rowId: string; newRowIndex: number }[],
  ) {
    // Validate for duplicates first
    const newIndices = updates.map((u) => u.newRowIndex);
    const duplicates = newIndices.filter(
      (index, i) => newIndices.indexOf(index) !== i,
    );

    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate row indices detected: ${duplicates.join(', ')}`,
      );
    }

    // Use transaction to ensure atomicity
    return await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.row.update({
          where: { id: update.rowId },
          data: { rowIndex: update.newRowIndex },
        }),
      ),
    );
  }

  // New method for batch cell updates with formula reference updates
  async batchUpdateCellsWithFormulaUpdates(
    cellUpdates: {
      id: string;
      value: string;
      formula?: string;
      color?: string;
    }[],
    rowMappings: { oldRowIndex: number; newRowIndex: number }[],
  ) {
    // Update formula references in the cell updates
    const updatedCellUpdates = cellUpdates.map((cell) => ({
      ...cell,
      formula: cell.formula
        ? this.updateFormulaReferences(cell.formula, rowMappings)
        : cell.formula,
    }));

    // Use transaction for atomic updates
    return await this.prisma.$transaction(
      updatedCellUpdates.map((cell) =>
        this.prisma.cell.update({
          where: { id: cell.id },
          data: {
            value: cell.value,
            formula: cell.formula,
            color: cell.color,
            isCalculated: !!cell.formula,
          },
        }),
      ),
    );
  }

  // Helper method to update formula references when rows are moved
  private updateFormulaReferences(
    formula: string,
    rowMappings: { oldRowIndex: number; newRowIndex: number }[],
  ): string {
    let updatedFormula = formula;

    // Create a mapping for quick lookups
    const mappingMap = new Map(
      rowMappings.map((m) => [m.oldRowIndex, m.newRowIndex]),
    );

    // Pattern to match cell references like A1, B2, Quantity5, Name2, etc.
    const cellReferencePattern = /([A-Za-z]+)(\d+)/g;

    updatedFormula = updatedFormula.replace(
      cellReferencePattern,
      (match, column, row) => {
        const rowIndex = parseInt(row);
        const newRowIndex = mappingMap.get(rowIndex);

        if (newRowIndex !== undefined) {
          return `${column}${newRowIndex}`;
        }

        return match; // No change needed
      },
    );

    // Handle range references like SUM(A1:A10)
    const rangePattern = /([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)/g;

    updatedFormula = updatedFormula.replace(
      rangePattern,
      (match, startCol, startRow, endCol, endRow) => {
        const startRowIndex = parseInt(startRow);
        const endRowIndex = parseInt(endRow);

        const newStartRow = mappingMap.get(startRowIndex) || startRowIndex;
        const newEndRow = mappingMap.get(endRowIndex) || endRowIndex;

        return `${startCol}${newStartRow}:${endCol}${newEndRow}`;
      },
    );

    return updatedFormula;
  }

  // New method for comprehensive row reorder with formula updates
  async reorderRowsWithFormulaUpdates(
    sheetId: string,
    rowReorders: { rowId: string; newRowIndex: number }[],
    affectedFormulas: {
      cellId: string;
      newFormula: string;
      newValue: string;
    }[],
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Update row positions
      for (const reorder of rowReorders) {
        await tx.row.update({
          where: { id: reorder.rowId },
          data: { rowIndex: reorder.newRowIndex },
        });
      }

      // Update formulas that reference moved rows
      for (const formulaUpdate of affectedFormulas) {
        await tx.cell.update({
          where: { id: formulaUpdate.cellId },
          data: {
            formula: formulaUpdate.newFormula,
            value: formulaUpdate.newValue,
            isCalculated: true,
          },
        });
      }
    });
  }
}

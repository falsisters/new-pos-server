import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SheetService } from './sheet.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { AddItemRowDto } from './dto/addItemRow.dto';
import {
  AddCalculationRowDto,
  AddCalculationRowsDto,
} from './dto/addCalculationRow.dto';
import { AddCellDto } from './dto/addCell.dto';
import { EditCellsDto } from './dto/editCells.dto';
import { AddCellsDto } from './dto/addCells.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('sheet')
export class SheetController {
  constructor(private sheetService: SheetService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get('date')
  async getSheetByDate(@Request() req) {
    const cashierId = req.user.id; // Changed from userId to cashierId
    const { startDate: startDateStr, endDate: endDateStr } = req.query;

    // Handle null/undefined values for startDate and endDate
    const startDate = startDateStr
      ? new Date(startDateStr as string)
      : undefined;
    const endDate = endDateStr ? new Date(endDateStr as string) : undefined;

    return this.sheetService.getSheetsByDateRange(
      cashierId,
      startDate,
      endDate,
    ); // Changed userId to cashierId
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/date')
  async getUserSheetByDate(@Request() req) {
    const userId = req.user.id;
    const { startDate: startDateStr, endDate: endDateStr } = req.query;

    // Handle null/undefined values for startDate and endDate
    const startDate = startDateStr
      ? new Date(startDateStr as string)
      : undefined;
    const endDate = endDateStr ? new Date(endDateStr as string) : undefined;

    return this.sheetService.getSheetsForUserByDateRange(
      userId,
      startDate,
      endDate,
    ); // New method
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('row')
  async createItemRow(@Body() addItemRowDto: AddItemRowDto) {
    const { sheetId, kahonItemId, rowIndex } = addItemRowDto;
    return this.sheetService.addItemRow(sheetId, kahonItemId, rowIndex);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/row')
  async createUserItemRow(@Body() addItemRowDto: AddItemRowDto) {
    const { sheetId, kahonItemId, rowIndex } = addItemRowDto;
    return this.sheetService.addItemRow(sheetId, kahonItemId, rowIndex);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('calculation-row')
  async createCalculationRow(
    @Body() addCalculationRowDto: AddCalculationRowDto,
  ) {
    const { sheetId, rowIndex } = addCalculationRowDto;
    return this.sheetService.addCalculationRow(sheetId, rowIndex);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/calculation-row')
  async createUserCalculationRow(
    @Body() addCalculationRowDto: AddCalculationRowDto,
  ) {
    const { sheetId, rowIndex } = addCalculationRowDto;
    return this.sheetService.addCalculationRow(sheetId, rowIndex);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('calculation-rows')
  async createCalculationRows(
    @Body() addCalculationRowDto: AddCalculationRowsDto,
  ) {
    const { sheetId, rowIndexes } = addCalculationRowDto;
    return Promise.all(
      rowIndexes.map((rowIndex) =>
        this.sheetService.addCalculationRow(sheetId, rowIndex),
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/calculation-rows')
  async createUserCalculationRows(
    @Body() addCalculationRowDto: AddCalculationRowsDto,
  ) {
    const { sheetId, rowIndexes } = addCalculationRowDto;
    return Promise.all(
      rowIndexes.map((rowIndex) =>
        this.sheetService.addCalculationRow(sheetId, rowIndex),
      ),
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete('row/:id')
  async deleteItemRow(@Param('id') id: string) {
    return this.sheetService.deleteRow(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('user/row/:id')
  async deleteUserItemRow(@Param('id') id: string) {
    return this.sheetService.deleteRow(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cell/:id')
  async updateCell(@Param('id') id: string, @Body() addCellDto: AddCellDto) {
    const { value, formula, color, rowIndex } = addCellDto;
    return this.sheetService.updateCell(id, value, formula, color, rowIndex);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/cell/:id')
  async updateUserCell(
    @Param('id') id: string,
    @Body() addCellDto: AddCellDto,
  ) {
    const { value, formula, color, rowIndex } = addCellDto;
    return this.sheetService.updateCell(id, value, formula, color, rowIndex);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('cell')
  async addCell(@Body() addCellDto: AddCellDto) {
    const { rowId, columnIndex, value, formula, color } = addCellDto;
    return this.sheetService.addCell(rowId, columnIndex, value, formula, color);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/cell')
  async addUserCell(@Body() addCellDto: AddCellDto) {
    const { rowId, columnIndex, value, formula, color } = addCellDto;
    return this.sheetService.addCell(rowId, columnIndex, value, formula, color);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete('cell/:id')
  async deleteCell(@Param('id') id: string) {
    return this.sheetService.deleteCell(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('user/cell/:id')
  async deleteUserCell(@Param('id') id: string) {
    return this.sheetService.deleteCell(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('cells')
  async addCells(@Body() addCellsDto: AddCellsDto) {
    const { cells } = addCellsDto;
    return this.sheetService.addCells(cells);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/cells')
  async addUserCells(@Body() addCellsDto: AddCellsDto) {
    const { cells } = addCellsDto;
    return this.sheetService.addCells(cells);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cells')
  async updateCells(@Body() editCellsDto: EditCellsDto) {
    return this.sheetService.updateCells(editCellsDto.cells);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/cells')
  async updateUserCells(@Body() editCellsDto: EditCellsDto) {
    return this.sheetService.updateCells(editCellsDto.cells);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:id')
  async getUserSheetById(@Param('id') id: string) {
    return this.sheetService.getSheetWithData(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/cells/batch')
  async batchUpdateUserCells(@Body() batchUpdateDto: { changes: any[] }) {
    const { changes } = batchUpdateDto;
    const results = [];
    const errors = [];

    console.log(
      'Batch update kahon cells received:',
      changes.length,
      'changes',
    );

    for (const change of changes) {
      try {
        console.log('Processing change:', {
          id: change.id,
          cellId: change.cellId,
          formula: change.formula,
          newValue: change.newValue,
          changeType: change.changeType,
        });

        if (change.changeType === 'update' && change.cellId) {
          // Update existing cell - explicitly pass formula
          const result = await this.sheetService.updateCell(
            change.cellId,
            change.newValue || '',
            change.formula, // Explicitly pass formula (can be null)
            change.color || undefined,
            change.rowIndex,
          );
          results.push({ changeId: change.id, result, success: true });
          console.log('Updated cell successfully:', change.cellId);
        } else if (change.changeType === 'add' && change.rowId) {
          // Add new cell - explicitly pass formula
          const result = await this.sheetService.addCell(
            change.rowId,
            change.columnIndex,
            change.newValue || '',
            change.formula, // Explicitly pass formula (can be null)
            change.color || undefined,
          );
          results.push({ changeId: change.id, result, success: true });
          console.log('Added new cell successfully:', result.id);
        } else {
          console.error(
            'Invalid change type or missing required fields:',
            change,
          );
          errors.push({
            changeId: change.id,
            error: 'Invalid change type or missing required fields',
            success: false,
          });
        }
      } catch (error) {
        console.error('Error processing change:', change.id, error);
        errors.push({
          changeId: change.id,
          error: error.message || 'Unknown error',
          success: false,
        });
      }
    }

    console.log(
      'Batch update completed. Results:',
      results.length,
      'Errors:',
      errors.length,
    );
    return { results, errors };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/rows/positions')
  async batchUpdateUserRowPositions(
    @Body() batchUpdateDto: { updates: any[] },
  ) {
    const { updates } = batchUpdateDto;
    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        await this.sheetService.updateRowPosition(
          update.rowId,
          update.newRowIndex,
        );
        results.push({ rowId: update.rowId, success: true });
      } catch (error) {
        errors.push({
          rowId: update.rowId,
          error: error.message || 'Unknown error',
          success: false,
        });
      }
    }

    return { results, errors };
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('rows/positions/batch')
  async batchUpdateRowPositions(
    @Body()
    batchUpdateDto: {
      updates: { rowId: string; newRowIndex: number }[];
    },
  ) {
    const { updates } = batchUpdateDto;

    try {
      const results = await this.sheetService.batchUpdateRowPositions(updates);
      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cells/formulas/batch')
  async batchUpdateCellsWithFormulas(
    @Body()
    batchUpdateDto: {
      cellUpdates: {
        id: string;
        value: string;
        formula?: string;
        color?: string;
      }[];
      rowMappings: { oldRowIndex: number; newRowIndex: number }[];
    },
  ) {
    const { cellUpdates, rowMappings } = batchUpdateDto;

    try {
      const results =
        await this.sheetService.batchUpdateCellsWithFormulaUpdates(
          cellUpdates,
          rowMappings,
        );
      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('reorder/comprehensive')
  async comprehensiveRowReorder(
    @Body()
    reorderDto: {
      sheetId: string;
      rowReorders: { rowId: string; newRowIndex: number }[];
      affectedFormulas: {
        cellId: string;
        newFormula: string;
        newValue: string;
      }[];
    },
  ) {
    const { sheetId, rowReorders, affectedFormulas } = reorderDto;

    try {
      await this.sheetService.reorderRowsWithFormulaUpdates(
        sheetId,
        rowReorders,
        affectedFormulas,
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

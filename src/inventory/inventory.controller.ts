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
import { InventoryService } from './inventory.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { AddCellsDto } from 'src/sheet/dto/addCells.dto';
import { EditCellsDto } from 'src/sheet/dto/editCells.dto';
import { AddCellDto } from 'src/sheet/dto/addCell.dto';
import {
  AddCalculationRowDto,
  AddInventoryRowsDto,
} from './dto/addCalculationRow.dto';
import { AddItemRowDto } from './dto/addItemRowDto.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get('expenses/date')
  async getExpensesSheetByDate(@Request() req) {
    const cashierId = req.user.id; // Changed from userId to cashierId
    const { startDate: startDateStr, endDate: endDateStr } = req.query;

    // Handle null/undefined values for startDate and endDate
    const startDate = startDateStr
      ? new Date(startDateStr as string)
      : undefined;
    const endDate = endDateStr ? new Date(endDateStr as string) : undefined;

    return this.inventoryService.getExpensesSheetsByDateRange(
      cashierId, // Changed from userId
      startDate,
      endDate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/expenses/date')
  async getUserExpensesSheetByDate(@Request() req) {
    const userId = req.user.id;
    const { startDate: startDateStr, endDate: endDateStr } = req.query;

    // Handle null/undefined values for startDate and endDate
    const startDate = startDateStr
      ? new Date(startDateStr as string)
      : undefined;
    const endDate = endDateStr ? new Date(endDateStr as string) : undefined;

    return this.inventoryService.getExpensesSheetsForUserByDateRange(
      // New method
      userId,
      startDate,
      endDate,
    );
  }

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

    return this.inventoryService.getInventorySheetsByDateRange(
      cashierId, // Changed from userId
      startDate,
      endDate,
    );
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

    return this.inventoryService.getInventorySheetsForUserByDateRange(
      // New method
      userId,
      startDate,
      endDate,
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('row')
  async createItemRow(@Body() addItemRowDto: AddItemRowDto) {
    const { sheetId, inventoryItemId, rowIndex } = addItemRowDto;
    return this.inventoryService.addItemRow(sheetId, inventoryItemId, rowIndex);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/row')
  async createUserItemRow(@Body() addItemRowDto: AddItemRowDto) {
    const { sheetId, inventoryItemId, rowIndex } = addItemRowDto;
    return this.inventoryService.addItemRow(sheetId, inventoryItemId, rowIndex);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('calculation-row')
  async createCalculationRow(
    @Body() addCalculationRowDto: AddCalculationRowDto,
  ) {
    const { sheetId, inventoryId, rowIndex, description } =
      addCalculationRowDto;
    return this.inventoryService.addCalculationRow(
      sheetId,
      rowIndex,
      description || '',
      inventoryId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/calculation-row')
  async createUserCalculationRow(
    @Body() addCalculationRowDto: AddCalculationRowDto,
  ) {
    const { sheetId, inventoryId, rowIndex, description } =
      addCalculationRowDto;
    return this.inventoryService.addCalculationRow(
      sheetId,
      rowIndex,
      description || '',
      inventoryId,
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('calculation-rows')
  async createCalculationRows(
    @Body() addCalculationRowDto: AddInventoryRowsDto,
  ) {
    const { sheetId, inventoryId, rowIndexes } = addCalculationRowDto;
    return Promise.all(
      rowIndexes.map((rowIndex) =>
        this.inventoryService.addCalculationRow(
          sheetId,
          rowIndex,
          '',
          inventoryId,
        ),
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/calculation-rows')
  async createUserCalculationRows(
    @Body() addCalculationRowDto: AddInventoryRowsDto,
  ) {
    const { sheetId, inventoryId, rowIndexes } = addCalculationRowDto;
    return Promise.all(
      rowIndexes.map((rowIndex) =>
        this.inventoryService.addCalculationRow(
          sheetId,
          rowIndex,
          '',
          inventoryId,
        ),
      ),
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete('row/:id')
  async deleteItemRow(@Param('id') id: string) {
    return this.inventoryService.deleteRow(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('user/row/:id')
  async deleteUserItemRow(@Param('id') id: string) {
    return this.inventoryService.deleteRow(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('cell')
  async addCell(@Body() addCellDto: AddCellDto) {
    const { rowId, columnIndex, value, formula, color } = addCellDto;
    return this.inventoryService.addCell(
      rowId,
      columnIndex,
      value,
      formula,
      color,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/cell')
  async addUserCell(@Body() addCellDto: AddCellDto) {
    const { rowId, columnIndex, value, formula, color } = addCellDto;
    return this.inventoryService.addCell(
      rowId,
      columnIndex,
      value,
      formula,
      color,
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cell/:id')
  async updateCell(@Param('id') id: string, @Body() addCellDto: AddCellDto) {
    const { value, formula, color, rowIndex } = addCellDto;
    return this.inventoryService.updateCell(
      id,
      value,
      formula,
      color,
      rowIndex,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/cell/:id')
  async updateUserCell(
    @Param('id') id: string,
    @Body() addCellDto: AddCellDto,
  ) {
    const { value, formula, color, rowIndex } = addCellDto;
    return this.inventoryService.updateCell(
      id,
      value,
      formula,
      color,
      rowIndex,
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete('cell/:id')
  async deleteCell(@Param('id') id: string) {
    return this.inventoryService.deleteCell(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('user/cell/:id')
  async deleteUserCell(@Param('id') id: string) {
    return this.inventoryService.deleteCell(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('cells')
  async addCells(@Body() addCellsDto: AddCellsDto) {
    const { cells } = addCellsDto;
    return this.inventoryService.addCells(cells);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/cells')
  async addUserCells(@Body() addCellsDto: AddCellsDto) {
    const { cells } = addCellsDto;
    return this.inventoryService.addCells(cells);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cells')
  async updateCells(@Body() editCellsDto: EditCellsDto) {
    return this.inventoryService.updateCells(editCellsDto.cells);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/cells')
  async updateUserCells(@Body() editCellsDto: EditCellsDto) {
    return this.inventoryService.updateCells(editCellsDto.cells);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('sheet/:id')
  async getInventorySheetById(@Param('id') id: string) {
    return this.inventoryService.getInventorySheetWithData(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/sheet/:id')
  async getUserInventorySheetById(@Param('id') id: string) {
    return this.inventoryService.getInventorySheetWithData(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/cells/batch')
  async batchUpdateUserCells(@Body() batchUpdateDto: { changes: any[] }) {
    const { changes } = batchUpdateDto;
    const results = [];
    const errors = [];

    for (const change of changes) {
      try {
        if (change.changeType === 'update' && change.cellId) {
          // Update existing cell
          const result = await this.inventoryService.updateCell(
            change.cellId,
            change.newValue || '',
            change.formula || undefined,
            change.color || undefined,
            change.rowIndex,
          );
          results.push({ changeId: change.id, result, success: true });
        } else if (change.changeType === 'add' && change.rowId) {
          // Add new cell
          const result = await this.inventoryService.addCell(
            change.rowId,
            change.columnIndex,
            change.newValue || '',
            change.formula || undefined,
            change.color || undefined,
          );
          results.push({ changeId: change.id, result, success: true });
        }
      } catch (error) {
        errors.push({
          changeId: change.id,
          error: error.message || 'Unknown error',
          success: false,
        });
      }
    }

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
        await this.inventoryService.updateRowPosition(
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
}

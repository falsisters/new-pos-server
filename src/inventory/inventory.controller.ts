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
    const userId = req.user.userId;
    const { startDate: startDateStr, endDate: endDateStr } = req.query;

    // Handle null/undefined values for startDate and endDate
    const startDate = startDateStr
      ? new Date(startDateStr as string)
      : undefined;
    const endDate = endDateStr ? new Date(endDateStr as string) : undefined;

    return this.inventoryService.getExpensesSheetsByDateRange(
      userId,
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

    return this.inventoryService.getExpensesSheetsByDateRange(
      userId,
      startDate,
      endDate,
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('date')
  async getSheetByDate(@Request() req) {
    const userId = req.user.userId;
    const { startDate: startDateStr, endDate: endDateStr } = req.query;

    // Handle null/undefined values for startDate and endDate
    const startDate = startDateStr
      ? new Date(startDateStr as string)
      : undefined;
    const endDate = endDateStr ? new Date(endDateStr as string) : undefined;

    return this.inventoryService.getInventorySheetsByDateRange(
      userId,
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

    return this.inventoryService.getInventorySheetsByDateRange(
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
    const { inventoryId, rowIndex } = addCalculationRowDto;
    return this.inventoryService.addCalculationRow(inventoryId, rowIndex);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/calculation-row')
  async createUserCalculationRow(
    @Body() addCalculationRowDto: AddCalculationRowDto,
  ) {
    const { inventoryId, rowIndex } = addCalculationRowDto;
    return this.inventoryService.addCalculationRow(inventoryId, rowIndex);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('calculation-rows')
  async createCalculationRows(
    @Body() addCalculationRowDto: AddInventoryRowsDto,
  ) {
    const { inventoryId, rowIndexes } = addCalculationRowDto;
    return Promise.all(
      rowIndexes.map((rowIndex) =>
        this.inventoryService.addCalculationRow(inventoryId, rowIndex),
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/calculation-rows')
  async createUserCalculationRows(
    @Body() addCalculationRowDto: AddInventoryRowsDto,
  ) {
    const { inventoryId, rowIndexes } = addCalculationRowDto;
    return Promise.all(
      rowIndexes.map((rowIndex) =>
        this.inventoryService.addCalculationRow(inventoryId, rowIndex),
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
    const { rowId, columnIndex, value, formula } = addCellDto;
    return this.inventoryService.addCell(rowId, columnIndex, value, formula);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/cell')
  async addUserCell(@Body() addCellDto: AddCellDto) {
    const { rowId, columnIndex, value, formula } = addCellDto;
    return this.inventoryService.addCell(rowId, columnIndex, value, formula);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cell/:id')
  async updateCell(@Param('id') id: string, @Body() addCellDto: AddCellDto) {
    const { value, formula } = addCellDto;
    return this.inventoryService.updateCell(id, value, formula);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/cell/:id')
  async updateUserCell(
    @Param('id') id: string,
    @Body() addCellDto: AddCellDto,
  ) {
    const { value, formula } = addCellDto;
    return this.inventoryService.updateCell(id, value, formula);
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
}

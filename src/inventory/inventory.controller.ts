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
import { AddCalculationRowDto } from './dto/addCalculationRow.dto';
import { AddItemRowDto } from './dto/addItemRowDto.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get('date')
  async getSheetByDate(@Request() req) {
    const cashierId = req.user.id;
    const { startDate: startDateStr, endDate: endDateStr } = req.query;

    // Handle null/undefined values for startDate and endDate
    const startDate = startDateStr
      ? new Date(startDateStr as string)
      : undefined;
    const endDate = endDateStr ? new Date(endDateStr as string) : undefined;

    return this.inventoryService.getInventorySheetsByDateRange(
      cashierId,
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

  @UseGuards(JwtCashierAuthGuard)
  @Post('calculation-row')
  async createCalculationRow(
    @Body() addCalculationRowDto: AddCalculationRowDto,
  ) {
    const { inventoryId, rowIndex } = addCalculationRowDto;
    return this.inventoryService.addCalculationRow(inventoryId, rowIndex);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete('row/:id')
  async deleteItemRow(@Param('id') id: string) {
    return this.inventoryService.deleteRow(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('cell')
  async addCell(@Body() addCellDto: AddCellDto) {
    const { rowId, columnIndex, value, formula } = addCellDto;
    return this.inventoryService.addCell(rowId, columnIndex, value, formula);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cell/:id')
  async updateCell(@Param('id') id: string, @Body() addCellDto: AddCellDto) {
    const { value, formula } = addCellDto;
    return this.inventoryService.updateCell(id, value, formula);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete('cell/:id')
  async deleteCell(@Param('id') id: string) {
    return this.inventoryService.deleteCell(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('cells')
  async addCells(@Body() addCellsDto: AddCellsDto) {
    const { cells } = addCellsDto;
    return this.inventoryService.addCells(cells);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cells')
  async updateCells(@Body() editCellsDto: EditCellsDto) {
    return this.inventoryService.updateCells(editCellsDto.cells);
  }
}

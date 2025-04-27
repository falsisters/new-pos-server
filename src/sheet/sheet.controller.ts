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

@Controller('sheet')
export class SheetController {
  constructor(private sheetService: SheetService) {}

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

    return this.sheetService.getSheetsByDateRange(userId, startDate, endDate);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('row')
  async createItemRow(@Body() addItemRowDto: AddItemRowDto) {
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

  @UseGuards(JwtCashierAuthGuard)
  @Delete('row/:id')
  async deleteItemRow(@Param('id') id: string) {
    return this.sheetService.deleteRow(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('cell')
  async addCell(@Body() addCellDto: AddCellDto) {
    const { rowId, columnIndex, value, formula } = addCellDto;
    return this.sheetService.addCell(rowId, columnIndex, value, formula);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cell/:id')
  async updateCell(@Param('id') id: string, @Body() addCellDto: AddCellDto) {
    const { value, formula } = addCellDto;
    return this.sheetService.updateCell(id, value, formula);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete('cell/:id')
  async deleteCell(@Param('id') id: string) {
    return this.sheetService.deleteCell(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('cells')
  async addCells(@Body() addCellsDto: AddCellsDto) {
    const { cells } = addCellsDto;
    return this.sheetService.addCells(cells);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cells')
  async updateCells(@Body() editCellsDto: EditCellsDto) {
    return this.sheetService.updateCells(editCellsDto.cells);
  }
}

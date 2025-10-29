import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { StockStatisticsFilterDto } from './dto/stock-statistics.dto';

@Controller('stock')
export class StockController {
  constructor(private stockService: StockService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get('statistics/cashier')
  async getStockStatisticsByCashier(
    @Request() req,
    @Query() filters: StockStatisticsFilterDto,
  ) {
    const cashierId = req.user.id;
    return this.stockService.getStockStatistics(cashierId, filters);
  }

  @UseGuards(JwtAuthGuard)
  @Get('statistics/user')
  async getStockStatisticsByUser(
    @Request() req,
    @Query() filters: StockStatisticsFilterDto,
  ) {
    const userId = req.user.id;
    return this.stockService.getStockStatisticsByUser(userId, filters);
  }
}

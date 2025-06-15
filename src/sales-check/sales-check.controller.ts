import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { SalesCheckService } from './sales-check.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { SalesCheckFilterDto } from './dto/sales-check.dto';
import { TotalSalesFilterDto } from './dto/total-sales.dto';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';

@Controller('sales-check')
export class SalesCheckController {
  constructor(private salesCheckService: SalesCheckService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSalesWithFilter(
    @Request() req,
    @Query() filterDto: SalesCheckFilterDto,
  ) {
    const userId = req.user.id;
    return this.salesCheckService.getSalesWithFilter(userId, filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('total')
  async getTotalSales(@Request() req, @Query() filterDto: TotalSalesFilterDto) {
    const userId = req.user.id;
    return this.salesCheckService.getTotalSales(userId, filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashiers/all')
  async getAllCashierSalesByDate(@Request() req, @Query('date') date?: string) {
    const userId = req.user.id;
    return this.salesCheckService.getAllCashierSalesByDate(userId, date);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getCashierSalesWithFilter(
    @Request() req,
    @Query() filterDto: SalesCheckFilterDto,
  ) {
    const cashierId = req.user.id; // This is the cashier ID from JwtCashierAuthGuard
    return this.salesCheckService.getCashierSalesWithFilter(
      cashierId,
      filterDto,
    );
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier/total')
  async getCashierTotalSales(
    @Request() req,
    @Query() filterDto: TotalSalesFilterDto,
  ) {
    const cashierId = req.user.id; // This is the cashier ID from JwtCashierAuthGuard
    return this.salesCheckService.getCashierTotalSales(cashierId, filterDto);
  }
}

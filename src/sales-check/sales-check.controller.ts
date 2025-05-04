import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { SalesCheckService } from './sales-check.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { SalesCheckFilterDto } from './dto/sales-check.dto';
import { TotalSalesFilterDto } from './dto/total-sales.dto';

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
}

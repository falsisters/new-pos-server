import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ProfitService } from './profit.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ProfitFilterDto } from './dto/profit-filter.dto';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';

@Controller('profit')
export class ProfitController {
  constructor(private profitService: ProfitService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfitsWithFilter(
    @Request() req,
    @Query() filterDto: ProfitFilterDto,
  ): Promise<any> {
    const userId = req.user.id;
    return this.profitService.getProfitsWithFilter(userId, filterDto);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getCashierProfitsWithFilter(
    @Request() req,
    @Query() filterDto: ProfitFilterDto,
  ): Promise<any> {
    const userId = req.user.userId;
    return this.profitService.getProfitsWithFilter(userId, filterDto);
  }
}

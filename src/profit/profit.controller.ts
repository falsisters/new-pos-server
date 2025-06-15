import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Get('cashiers/all')
  async getAllCashierProfitsByDate(
    @Request() req,
    @Query('date') date?: string,
  ): Promise<any> {
    const userId = req.user.id;
    return this.profitService.getAllCashierProfitsByDate(userId, date);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getCashierProfitsWithFilter(
    @Request() req,
    @Query() filterDto: ProfitFilterDto,
  ): Promise<any> {
    const cashierId = req.user.id; // This is the cashier ID from JwtCashierAuthGuard
    return this.profitService.getCashierProfitsWithFilter(cashierId, filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier/:cashierId')
  async getProfitsByCashierId(
    @Param('cashierId') cashierId: string,
    @Query() filterDto: ProfitFilterDto,
  ): Promise<any> {
    return this.profitService.getCashierProfitsWithFilter(cashierId, filterDto);
  }
}

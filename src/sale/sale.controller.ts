import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { CreateSaleDto } from './dto/create.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { EditSaleDto } from './dto/edit.dto';
import { RecentSalesFilterDto } from './dto/recent-sales.dto';

@Controller('sale')
export class SaleController {
  constructor(private saleService: SaleService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getAllSalesByUser(@Request() req, @Query('date') date?: string) {
    const userId = req.user.id;
    return this.saleService.getAllSales(userId, date);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getAllSalesByCashier(@Request() req, @Query('date') date?: string) {
    const cashierId = req.user.id;
    return this.saleService.getSalesByCashier(cashierId, date);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('create')
  async createSale(@Request() req, @Body() createSaleDto: CreateSaleDto) {
    const cashierId = req.user.id;
    return this.saleService.createSale(cashierId, createSaleDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateSale(@Param('id') id: string, @Body() editSaleDto: EditSaleDto) {
    return this.saleService.editSale(id, editSaleDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteSale(@Param('id') id: string) {
    return this.saleService.deleteSale(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getSale(@Param('id') id: string) {
    return this.saleService.getSale(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('recent/cashier')
  async getRecentSales(@Request() req, @Query() filters: RecentSalesFilterDto) {
    const cashierId = req.user.id;
    return this.saleService.getSalesByDate(cashierId, filters);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier/:cashierId')
  async getSalesByCashierId(
    @Request() req,
    @Param('cashierId') cashierId: string,
    @Query() filters: RecentSalesFilterDto,
  ) {
    const userId = req.user.id;
    return this.saleService.getSalesByCashierId(userId, cashierId, filters.date);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('total-cash')
  async getTotalCashForDate(@Request() req, @Query('date') date?: string) {
    const cashierId = req.user.id;
    return this.saleService.getTotalCashForDate(cashierId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier/:cashierId/total-cash')
  async getCashierTotalCashForDate(
    @Param('cashierId') cashierId: string,
    @Query('date') date?: string,
  ) {
    return this.saleService.getTotalCashForDate(cashierId, date);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('voided/cashier')
  async getVoidedSalesByCashier(@Request() req) {
    const cashierId = req.user.id;
    return this.saleService.getVoidedSalesByCashier(cashierId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('voided/user')
  async getVoidedSalesByUser(@Request() req) {
    const userId = req.user.id;
    return this.saleService.getVoidedSalesByUser(userId);
  }
}

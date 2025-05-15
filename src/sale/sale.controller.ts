import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { CreateSaleDto } from './dto/create.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { EditSaleDto } from './dto/edit.dto';

@Controller('sale')
export class SaleController {
  constructor(private saleService: SaleService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getAllSalesByUser(@Request() req) {
    const userId = req.user.id;
    return this.saleService.getAllSales(userId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getAllSalesByCashier(@Request() req) {
    const cashierId = req.user.id;
    return this.saleService.getSalesByCashier(cashierId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('create')
  async createSale(@Request() req, @Body() createSaleDto: CreateSaleDto) {
    const cashierId = req.user.id;
    return this.saleService.createSale(cashierId, createSaleDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateSale(@Param('id') id: string, editSaleDto: EditSaleDto) {
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
  @Get('recent')
  async getRecentSales(@Request() req) {
    const cashierId = req.user.id;
    return this.saleService.getLastFiveSales(cashierId);
  }
}

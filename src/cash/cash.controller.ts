import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CashService } from './cash.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { CreateBillCountDto } from './dto/createBillCount.dto';
import { UpdateBillCountDto } from './dto/updateBillCount.dto';

@Controller('cash')
export class CashController {
  constructor(private cashService: CashService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get()
  async getAllBillCountsByDate(@Request() req) {
    const userId = req.user.userId;
    return this.cashService.getAllBillCountsByDate(userId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post()
  async createBillCount(
    @Request() req,
    @Body() createBillCountDto: CreateBillCountDto,
  ) {
    const userId = req.user.userId;
    return this.cashService.createBillCount(userId, createBillCountDto);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch('count/:id')
  async updateBillCount(
    @Param('id') id: string,
    @Body() updateBillCountDto: UpdateBillCountDto,
  ) {
    return this.cashService.updateBillCount(id, updateBillCountDto);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get(':id')
  async getBillCountById(@Param('id') id: string) {
    return this.cashService.getBillCountById(id);
  }
}

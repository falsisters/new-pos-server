import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BillsService } from './bills.service';
import { CreateBillCountDto } from './dto/create-bill-count.dto';
import { UpdateBillCountDto } from './dto/update-bill-count.dto';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Post()
  async createOrUpdateBillCount(
    @Request() req,
    @Body() createDto: CreateBillCountDto,
  ) {
    const userId = req.user.userId;
    return this.billsService.createOrUpdateBillCount(userId, createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user')
  async createOrUpdateUserBillCount(
    @Request() req,
    @Body() createDto: CreateBillCountDto,
  ) {
    const userId = req.user.id;
    return this.billsService.createOrUpdateBillCount(userId, createDto);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Put(':id')
  async updateBillCount(
    @Param('id') id: string,
    @Body() updateDto: UpdateBillCountDto,
  ) {
    return this.billsService.updateBillCount(id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('user/:id')
  async updateUserBillCount(
    @Param('id') id: string,
    @Body() updateDto: UpdateBillCountDto,
  ) {
    return this.billsService.updateBillCount(id, updateDto);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get()
  async getBillCountForDate(@Request() req, @Query('date') date?: string) {
    const userId = req.user.userId;
    return this.billsService.getBillCountForDate(userId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getUserBillCountForDate(@Request() req, @Query('date') date?: string) {
    const userId = req.user.id;
    return this.billsService.getBillCountForDate(userId, date);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get(':id')
  async getBillCountById(@Param('id') id: string) {
    return this.billsService.getBillCountById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:id')
  async getUserBillCountById(@Param('id') id: string) {
    return this.billsService.getBillCountById(id);
  }
}

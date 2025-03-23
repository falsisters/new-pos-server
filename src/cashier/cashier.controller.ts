import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { CashierService } from './cashier.service';
import { LocalCashierAuthGuard } from './guards/local.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RegisterCashierDto } from './dto/register.dto';
import { JwtCashierAuthGuard } from './guards/jwt.guard';
import { EditCashierDto } from './dto/edit.dto';

@Controller('cashier')
export class CashierController {
  constructor(private cashierService: CashierService) { }

  @UseGuards(LocalCashierAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.cashierService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(
    @Request() req,
    @Body() registerCashierDto: RegisterCashierDto,
  ) {
    const userId = req.user.id;
    return this.cashierService.register(userId, registerCashierDto);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get()
  async getCashier(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllCashiers(@Request() req) {
    const userId = req.user.id;
    return this.cashierService.getAllCashiers(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getCashierById(@Param('id') id: string) {
    return this.cashierService.getCashier(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateCashier(
    @Param('id') id: string,
    @Body() editCashierDto: EditCashierDto,
  ) {
    return this.cashierService.editCashier(id, editCashierDto);
  }
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCashier(@Param('id') id: string) {
    return this.cashierService.deleteCashier(id);
  }
}
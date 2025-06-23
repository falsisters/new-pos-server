import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ShiftService } from './shift.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { CreateShiftDto } from './dto/create.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { EditShiftDto } from './dto/edit.dto';

@Controller('shift')
export class ShiftController {
  constructor(private shiftService: ShiftService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Post('create')
  async createShift(@Request() req, @Body() createShiftDto: CreateShiftDto) {
    const cashierId = req.user.id;
    return this.shiftService.createShift(cashierId, createShiftDto);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('end/:id')
  async endShift(@Param('id') id: string) {
    return this.shiftService.endShift(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateShift(
    @Param('id') id: string,
    @Body() editShiftDto: EditShiftDto,
  ) {
    return this.shiftService.editShift(id, editShiftDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteShift(@Param('id') id: string) {
    return this.shiftService.deleteShift(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getShifts(@Request() req) {
    const id = req.user.id;
    return this.shiftService.getAllShiftsByCashierId(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getShift(@Param('id') id: string) {
    return this.shiftService.getShiftById(id);
  }
}

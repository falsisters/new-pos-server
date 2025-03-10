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
import { DeliveryService } from './delivery.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { CreateDeliveryDto } from './dto/create.dto';
import { EditDeliveryDto } from './dto/edit.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('delivery')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getAllDeliveriesByUser(@Request() req) {
    const userId = req.user.id;
    return this.deliveryService.getAllDeliveries(userId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Post('create')
  async createDelivery(
    @Request() req,
    @Body() createDeliveryDto: CreateDeliveryDto,
  ) {
    const cashierId = req.user.id;
    return this.deliveryService.createDelivery(cashierId, createDeliveryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getDelivery(@Param('id') id: string) {
    return this.deliveryService.getDelivery(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async editDelivery(
    @Param('id') id: string,
    @Body() editDeliveryDto: EditDeliveryDto,
  ) {
    return this.deliveryService.editDelivery(id, editDeliveryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteDelivery(@Param('id') id: string) {
    return this.deliveryService.deleteDelivery(id);
  }
}

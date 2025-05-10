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
import { OrderService } from './order.service';
import { JwtCustomerAuthGuard } from 'src/customer/guards/jwt.guard';
import { CreateOrderDto } from './dto/createOrder.dto';

@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @UseGuards(JwtCustomerAuthGuard)
  @Get('all')
  async getAllOrders(@Request() req) {
    const customerId = req.user.id;
    return this.orderService.getAllOrders(customerId);
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Get(':id')
  async getOrderById(@Request() req, @Param('id') id: string) {
    const customerId = req.user.id;
    return this.orderService.getOrderById(id);
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Post('create')
  async createOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    const customerId = req.user.id;
    return this.orderService.createOrder(customerId, createOrderDto);
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Patch('update/:id')
  async updateOrder(
    @Request() req,
    @Param('id') id: string,
    @Body() updateOrderDto: Partial<CreateOrderDto>,
  ) {
    return this.orderService.editOrder(id, updateOrderDto);
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Patch('cancel/:id')
  async cancelOrder(@Request() req, @Param('id') id: string) {
    return this.orderService.cancelOrder(id);
  }
}

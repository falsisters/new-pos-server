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
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';

@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getAllOrdersByCashier(@Request() req) {
    const userId = req.user.userId;
    return this.orderService.getUserOrders(userId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier/:id')
  async getOrderByIdByCashier(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.orderService.getUserOrderById(userId, id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier-orders')
  async getCashierOrders(@Request() req) {
    const cashierId = req.user.cashierId;
    return this.orderService.getCashierOrders(cashierId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier-orders/:id')
  async getCashierOrderById(@Request() req, @Param('id') id: string) {
    const cashierId = req.user.cashierId;
    return this.orderService.getCashierOrderById(cashierId, id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get('products-for-order')
  async getProductsForOrder(@Request() req) {
    const cashierId = req.user.cashierId;
    return this.orderService.getAvailableProductsForOrderByCashier(cashierId);
  }

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

  @UseGuards(JwtCashierAuthGuard)
  @Patch('cancel/:id')
  async cancelOrder(@Request() req, @Param('id') id: string) {
    return this.orderService.cancelOrder(id);
  }
}

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
import { CustomerService } from './customer.service';
import { LocalCustomerAuthGuard } from './guards/local.guard';
import { JwtCustomerAuthGuard } from './guards/jwt.guard';
import { RegisterCustomerDto } from './dto/register.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('customer')
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  @UseGuards(LocalCustomerAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.customerService.login(req.user);
  }

  @Post('register')
  async register(@Body() registerCustomerDto: RegisterCustomerDto) {
    return this.customerService.register(registerCustomerDto);
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Get()
  async getCustomer(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Get('all')
  async getAllCustomers(@Request() req) {
    return this.customerService.getAllCustomers();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getCustomerById(@Request() req, @Param('id') id: string) {
    return this.customerService.getCustomer(id);
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Patch(':id')
  async updateCustomer(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCustomerDto: Partial<RegisterCustomerDto>,
  ) {
    return this.customerService.editCustomer(id, updateCustomerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCustomer(@Request() req, @Param('id') id: string) {
    return this.customerService.deleteCustomer(id);
  }
}

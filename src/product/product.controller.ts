import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { CreateProductDto } from './dto/create.dto';
import { EditProductDto } from './dto/edit.dto';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';

@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getAllProductsByCashier(@Request() req) {
    const userId = req.user.userId;
    return this.productService.getAllProducts(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getAllProductsByUser(@Request() req) {
    const userId = req.user.id;
    return this.productService.getAllProducts(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createProduct(@Request() req, createProductDto: CreateProductDto) {
    const userId = req.user.id;
    return this.productService.createProduct(userId, createProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateProduct(@Param('id') id: string, editProductDto: EditProductDto) {
    return this.productService.editProduct(id, editProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }
}

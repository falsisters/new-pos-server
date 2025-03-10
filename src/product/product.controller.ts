import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { CreateProductDto } from './dto/create.dto';
import { EditProductDto } from './dto/edit.dto';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';

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
  @UseInterceptors(FileInterceptor('picture'))
  @Post('create')
  async createProduct(
    @Request() req,
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    const userId = req.user.id;
    return this.productService.createProduct(userId, {
      ...createProductDto,
      picture,
    });
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

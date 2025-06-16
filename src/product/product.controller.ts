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
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtCustomerAuthGuard } from 'src/customer/guards/jwt.guard';

@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get('cashier')
  async getAllProductsByCashier(@Request() req) {
    const userId = req.user.userId;
    return this.productService.getAllProducts(userId);
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Get('customer')
  async getAllProductsByCustomer(@Request() req) {
    return this.productService.getAllPublicProducts();
  }

  @UseGuards(JwtCustomerAuthGuard)
  @Get('customer/:id')
  async getPublicProductById(@Param('id') id: string) {
    return this.productService.getPublicProductById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getAllProductsByUser(@Request() req) {
    const userId = req.user.id;
    return this.productService.getAllProducts(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('picture', {
      limits: {
        fileSize: 9 * 1024 * 1024, // 8MB
      },
    }),
  )
  @Post('create')
  async createProduct(
    @Request() req,
    @Body() formData: any,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    const userId = req.user.id;
    return this.productService.createProduct(userId, {
      ...formData,
      picture,
    });
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('picture', {
      limits: {
        fileSize: 9 * 1024 * 1024, // 9MB
      },
    }),
  )
  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() formData: any,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    return this.productService.editProduct(id, {
      ...formData,
      picture,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }
}

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
    const cashierId = req.user.id; // Changed to use cashierId directly
    return this.productService.getAllProductsByCashier(cashierId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cashier/:id')
  async getAllProductsByCashierId(@Request() req, @Param('id') id: string) {
    return this.productService.getAllProductsByCashier(id);
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

  @UseGuards(JwtCashierAuthGuard)
  @UseInterceptors(
    FileInterceptor('picture', {
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
        fieldSize: 15 * 1024 * 1024, // 15MB
      },
      fileFilter: (req, file, callback) => {
        // Enhanced file filter for better image format support
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/tiff',
          'image/tif',
          'image/avif',
          'image/heic',
          'image/heif',
          'image/bmp',
          'image/gif',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Only image files (JPEG, PNG, WebP, HEIC, TIFF, AVIF, BMP, GIF) are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  @Post('cashier/create')
  async createProductByCashier(
    @Request() req,
    @Body() formData: any,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    const cashierId = req.user.id;
    const userId = req.user.userId; // Assuming the userId is stored in the request
    return this.productService.createProduct(
      cashierId,
      {
        ...formData,
        picture,
      },
      userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('picture', {
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
        fieldSize: 15 * 1024 * 1024, // 15MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/tiff',
          'image/tif',
          'image/avif',
          'image/heic',
          'image/heif',
          'image/bmp',
          'image/gif',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Only image files (JPEG, PNG, WebP, HEIC, TIFF, AVIF, BMP, GIF) are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  @Post('user/create/:cashierId')
  async createProductForCashier(
    @Request() req,
    @Param('cashierId') cashierId: string,
    @Body() formData: any,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    const userId = req.user.id;

    return this.productService.createProductForCashier(userId, cashierId, {
      ...formData,
      picture,
    });
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('picture', {
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
        fieldSize: 15 * 1024 * 1024, // 15MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/tiff',
          'image/tif',
          'image/avif',
          'image/heic',
          'image/heif',
          'image/bmp',
          'image/gif',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Only image files (JPEG, PNG, WebP, HEIC, TIFF, AVIF, BMP, GIF) are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  @Patch('user/:id')
  async updateProductByUser(
    @Request() req,
    @Param('id') id: string,
    @Body() formData: any,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    const userId = req.user.id;

    // Verify that the product belongs to a cashier under this user
    await this.productService.verifyProductOwnership(userId, id);

    // Extract cashierId from formData if provided for reassignment
    const cashierId = formData.cashierId;

    return this.productService.editProduct(
      id,
      {
        ...formData,
        picture,
      },
      cashierId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/:id/assign-cashier/:cashierId')
  async assignCashierToProduct(
    @Request() req,
    @Param('id') id: string,
    @Param('cashierId') cashierId: string,
  ) {
    const userId = req.user.id;
    return this.productService.assignCashierToProduct(userId, id, cashierId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/unassigned')
  async getUnassignedProducts(@Request() req) {
    const userId = req.user.id;
    return this.productService.getUnassignedProducts(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('user/:id')
  async deleteProductByUser(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;

    // Verify that the product belongs to a cashier under this user
    await this.productService.verifyProductOwnership(userId, id);

    return this.productService.deleteProduct(id);
  }
}

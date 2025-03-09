import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UploadModule } from 'src/upload/upload.module';
import { UploadService } from 'src/upload/upload.service';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule, UploadModule],
  controllers: [ProductController],
  providers: [ProductService, PrismaService, JwtService, UploadService],
})
export class ProductModule {}

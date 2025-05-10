import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CustomerModule } from 'src/customer/customer.module';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [CustomerModule, AuthModule, PrismaModule],
  controllers: [OrderController],
  providers: [OrderService, PrismaService, JwtService],
})
export class OrderModule {}

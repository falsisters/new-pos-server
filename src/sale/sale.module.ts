import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { AuthModule } from 'src/auth/auth.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { OrderModule } from 'src/order/order.module';
import { OrderService } from 'src/order/order.service';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule, OrderModule],
  controllers: [SaleController],
  providers: [SaleService, PrismaService, JwtService, OrderService],
})
export class SaleModule {}

import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { AuthModule } from 'src/auth/auth.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule],
  controllers: [SaleController],
  providers: [SaleService, PrismaService, JwtService],
})
export class SaleModule {}

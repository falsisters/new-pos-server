import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { AuthModule } from 'src/auth/auth.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}

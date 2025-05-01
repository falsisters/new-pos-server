import { Module } from '@nestjs/common';
import { SalesCheckController } from './sales-check.controller';
import { SalesCheckService } from './sales-check.service';
import { AuthModule } from 'src/auth/auth.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule],
  controllers: [SalesCheckController],
  providers: [SalesCheckService, PrismaService, JwtService],
})
export class SalesCheckModule {}

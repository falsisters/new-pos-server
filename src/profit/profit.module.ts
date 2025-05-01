import { Module } from '@nestjs/common';
import { ProfitController } from './profit.controller';
import { ProfitService } from './profit.service';
import { AuthModule } from 'src/auth/auth.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule],
  controllers: [ProfitController],
  providers: [ProfitService, JwtService, PrismaService],
})
export class ProfitModule {}

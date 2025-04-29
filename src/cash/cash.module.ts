import { Module } from '@nestjs/common';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { AuthModule } from 'src/auth/auth.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule],
  controllers: [CashController],
  providers: [CashService, PrismaService, JwtService],
})
export class CashModule {}

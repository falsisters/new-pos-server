import { Module } from '@nestjs/common';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { AuthModule } from 'src/auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule, CashierModule, AuthModule],
  controllers: [BillsController],
  providers: [BillsService, PrismaService, JwtService],
})
export class BillsModule {}

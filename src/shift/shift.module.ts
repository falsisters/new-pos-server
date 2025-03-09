import { Module } from '@nestjs/common';
import { ShiftController } from './shift.controller';
import { ShiftService } from './shift.service';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [CashierModule, AuthModule],
  controllers: [ShiftController],
  providers: [ShiftService, PrismaService, JwtService],
})
export class ShiftModule {}

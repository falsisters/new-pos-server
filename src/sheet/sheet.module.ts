import { Module } from '@nestjs/common';
import { SheetController } from './sheet.controller';
import { SheetService } from './sheet.service';
import { AuthModule } from 'src/auth/auth.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule],
  controllers: [SheetController],
  providers: [SheetService, PrismaService, JwtService],
  exports: [SheetService],
})
export class SheetModule {}

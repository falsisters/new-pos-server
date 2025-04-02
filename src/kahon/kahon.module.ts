import { Module } from '@nestjs/common';
import { KahonController } from './kahon.controller';
import { KahonService } from './kahon.service';
import { AuthModule } from 'src/auth/auth.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule],
  controllers: [KahonController],
  providers: [KahonService, PrismaService, JwtService],
})
export class KahonModule {}

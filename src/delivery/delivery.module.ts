import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { AuthModule } from 'src/auth/auth.module';
import { CashierModule } from 'src/cashier/cashier.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TransferModule } from 'src/transfer/transfer.module';
import { TransferService } from 'src/transfer/transfer.service';

@Module({
  imports: [AuthModule, CashierModule, PrismaModule, TransferModule],
  controllers: [DeliveryController],
  providers: [DeliveryService, PrismaService, JwtService, TransferService],
})
export class DeliveryModule {}

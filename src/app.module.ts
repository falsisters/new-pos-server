import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { CashierModule } from './cashier/cashier.module';
import { ShiftModule } from './shift/shift.module';
import { EmployeeModule } from './employee/employee.module';
import { ProductModule } from './product/product.module';
import { UploadModule } from './upload/upload.module';
import { SaleModule } from './sale/sale.module';
import { DeliveryModule } from './delivery/delivery.module';
import { TransferModule } from './transfer/transfer.module';
import { KahonModule } from './kahon/kahon.module';
import { InventoryModule } from './inventory/inventory.module';
import { SheetModule } from './sheet/sheet.module';
import { CashModule } from './cash/cash.module';
import { AttachmentModule } from './attachment/attachment.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CashierModule,
    ShiftModule,
    EmployeeModule,
    ProductModule,
    UploadModule,
    SaleModule,
    DeliveryModule,
    TransferModule,
    KahonModule,
    InventoryModule,
    SheetModule,
    CashModule,
    AttachmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

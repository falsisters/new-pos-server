import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { AttachmentModule } from './attachment/attachment.module';
import { SalesCheckModule } from './sales-check/sales-check.module';
import { ProfitModule } from './profit/profit.module';
import { BillsModule } from './bills/bills.module';
import { OrderModule } from './order/order.module';
import { CustomerModule } from './customer/customer.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DatabaseModule } from './database/database.module';
import { StockModule } from './stock/stock.module';
import { EventsModule } from './events/events.module';
import { StorageModule } from './storage/storage.module';
import { CommonModule } from './common/common.module';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
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
    AttachmentModule,
    SalesCheckModule,
    ProfitModule,
    BillsModule,
    OrderModule,
    CustomerModule,
    ExpensesModule,
    DatabaseModule,
    StockModule,
    EventsModule,
    StorageModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}

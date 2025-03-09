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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

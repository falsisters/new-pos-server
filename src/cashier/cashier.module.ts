import { Module } from '@nestjs/common';
import { CashierController } from './cashier.controller';
import { CashierService } from './cashier.service';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { LocalCashierStrategy } from './strategies/local.strategy';
import { JwtCashierStrategy } from './strategies/jwt.strategy';
import { AuthService } from 'src/auth/auth.service';

@Module({
  imports: [PassportModule, PrismaModule, AuthModule, JwtModule.register({})],
  controllers: [CashierController],
  providers: [
    CashierService,
    LocalCashierStrategy,
    JwtCashierStrategy,
    AuthService,
  ],
})
export class CashierModule {}

import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { LocalCustomerStrategy } from './strategies/local.strategy';
import { JwtCustomerStrategy } from './strategies/jwt.strategy';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PassportModule, PrismaModule, AuthModule, JwtModule.register({})],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    LocalCustomerStrategy,
    JwtCustomerStrategy,
    AuthService,
    PrismaService,
  ],
})
export class CustomerModule {}

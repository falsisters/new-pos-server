import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [IdempotencyInterceptor],
  exports: [IdempotencyInterceptor],
})
export class CommonModule {}

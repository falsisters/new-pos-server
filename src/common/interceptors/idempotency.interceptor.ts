import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { EMPTY, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey || request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return next.handle();
    }

    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      response.status(HttpStatus.CONFLICT).json(existing.responseBody);
      return EMPTY;
    }

    return next.handle().pipe(
      mergeMap(async (data) => {
        try {
          await this.prisma.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              responseBody: data ?? {},
              statusCode: response.statusCode || HttpStatus.OK,
            },
          });
        } catch (_e) {
          // Race condition: another concurrent request with same key
          // stored first. Silently accept.
        }
        return data;
      }),
    );
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static instance: PrismaService;
  private isConnected = false;

  constructor() {
    // Return existing instance in serverless environments
    if (PrismaService.instance) {
      return PrismaService.instance;
    }

    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL +
            '?connection_limit=1&pool_timeout=20&pgbouncer=true',
        },
      },
    });

    PrismaService.instance = this;
  }

  async onModuleInit() {
    if (!this.isConnected) {
      try {
        await this.$connect();
        this.isConnected = true;
      } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
      this.isConnected = false;
    }
  }

  // Override $connect to prevent multiple connections
  async $connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    await super.$connect();
    this.isConnected = true;
  }

  // Override $disconnect to handle cleanup
  async $disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    await super.$disconnect();
    this.isConnected = false;
  }

  /**
   * Execute a timezone-aware query using PostgreSQL's AT TIME ZONE functionality.
   * This is useful for complex date queries that need precise timezone handling.
   *
   * Example:
   * ```typescript
   * const result = await prisma.queryWithTimezone(`
   *   SELECT * FROM "Sale"
   *   WHERE "createdAt" AT TIME ZONE 'Asia/Manila' >= $1::date
   *   AND "createdAt" AT TIME ZONE 'Asia/Manila' < $2::date + interval '1 day'
   * `, ['2024-03-15', '2024-03-15']);
   * ```
   */
  async queryWithTimezone<T = any>(
    query: string,
    values: any[] = [],
  ): Promise<T[]> {
    return this.$queryRawUnsafe<T[]>(query, ...values);
  }

  /**
   * Helper method to get records within a date range in Manila timezone.
   * This uses PostgreSQL's timezone conversion for accurate filtering.
   */
  async findManyWithDateFilter<T>(
    tableName: string,
    dateColumn: string = 'createdAt',
    dateValue: string,
    additionalWhere: string = '',
    values: any[] = [],
  ): Promise<T[]> {
    const whereClause = additionalWhere ? `AND ${additionalWhere}` : '';

    const query = `
      SELECT * FROM "${tableName}"
      WHERE "${dateColumn}" AT TIME ZONE 'Asia/Manila' >= $1::date
      AND "${dateColumn}" AT TIME ZONE 'Asia/Manila' < $1::date + interval '1 day'
      ${whereClause}
      ORDER BY "${dateColumn}" DESC
    `;

    return this.queryWithTimezone<T>(query, [dateValue, ...values]);
  }
}

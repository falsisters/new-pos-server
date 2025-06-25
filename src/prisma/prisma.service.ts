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
}

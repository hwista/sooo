import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@ssoo/database';
import { commonColumnsExtension } from '@ssoo/database';

/**
 * Database Service
 * 
 * Prisma Client with commonColumnsExtension
 * - 공통 컬럼(createdAt, updatedAt, deletedAt) 자동 관리
 * - softDelete 지원
 */
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB, PG_POOL } from './database.tokens';
import { TransactionRunner } from './transaction.runner';
import * as schema from './schema';

const poolProvider = {
  provide: PG_POOL,
  useFactory: () =>
    new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'crm_user',
      password: process.env.DB_PASSWORD || 'crm_password',
      database: process.env.DB_NAME || 'crm_db',
    }),
};

const drizzleProvider = {
  provide: DRIZZLE_DB,
  useFactory: (pool: Pool) => drizzle(pool, { schema }),
  inject: [PG_POOL],
};

@Global()
@Module({
  providers: [poolProvider, drizzleProvider, TransactionRunner],
  exports: [poolProvider, drizzleProvider, TransactionRunner],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}

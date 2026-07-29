import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from './database.tokens';

export type Queryable = any;

@Injectable()
export class TransactionRunner {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async run<T>(work: (tx: Queryable) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }
}

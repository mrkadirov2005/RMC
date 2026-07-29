import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { owners } from '../../../database/schema';
import type { OwnersRecord } from '../domain/owners.entity';
import type { OwnersRepositoryPort } from '../domain/owners.repository.port';

const table: any = owners;
const pk: any = table.ownerId;
const centerColumn: any = table.centerId;
const updatedAtColumn: any = table.updatedAt;

@Injectable()
export class PostgresOwnersRepository implements OwnersRepositoryPort {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async findAll(centerId?: number): Promise<OwnersRecord[]> {
    const query = this.db.select().from(table);
    const rows = centerId && centerColumn
      ? await query.where(eq(centerColumn, centerId)).orderBy(desc(pk))
      : await query.orderBy(desc(pk));
    return rows;
  }

  async findById(id: number, centerId?: number): Promise<OwnersRecord | null> {
    const filters = [eq(pk, id)];
    if (centerId && centerColumn) filters.push(eq(centerColumn, centerId));
    const rows = await this.db.select().from(table).where(and(...filters)).limit(1);
    return rows[0] || null;
  }

  async create(payload: Record<string, unknown>, centerId?: number): Promise<OwnersRecord> {
    const data = centerId && centerColumn && !payload.centerId && !payload.center_id
      ? { ...payload, centerId }
      : payload;
    const rows = await this.db.insert(table).values(data).returning();
    return rows[0];
  }

  async update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<OwnersRecord | null> {
    const filters = [eq(pk, id)];
    if (centerId && centerColumn) filters.push(eq(centerColumn, centerId));
    const setData = updatedAtColumn
      ? { ...payload, updatedAt: sql`CURRENT_TIMESTAMP` }
      : payload;
    const rows = await this.db.update(table).set(setData).where(and(...filters)).returning();
    return rows[0] || null;
  }

  async delete(id: number, centerId?: number): Promise<OwnersRecord | null> {
    const filters = [eq(pk, id)];
    if (centerId && centerColumn) filters.push(eq(centerColumn, centerId));
    const rows = await this.db.delete(table).where(and(...filters)).returning();
    return rows[0] || null;
  }
}

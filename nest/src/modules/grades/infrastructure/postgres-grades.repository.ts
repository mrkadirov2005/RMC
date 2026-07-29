import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { grades } from '../../../database/schema';
import type { GradesRecord } from '../domain/grades.entity';
import type { GradesRepositoryPort } from '../domain/grades.repository.port';

const table: any = grades;
const pk: any = table.gradeId;
const centerColumn: any = table.centerId;
const updatedAtColumn: any = table.updatedAt;

@Injectable()
export class PostgresGradesRepository implements GradesRepositoryPort {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async findAll(centerId?: number): Promise<GradesRecord[]> {
    const query = this.db.select().from(table);
    const rows = centerId && centerColumn
      ? await query.where(eq(centerColumn, centerId)).orderBy(desc(pk))
      : await query.orderBy(desc(pk));
    return rows;
  }

  async findById(id: number, centerId?: number): Promise<GradesRecord | null> {
    const filters = [eq(pk, id)];
    if (centerId && centerColumn) filters.push(eq(centerColumn, centerId));
    const rows = await this.db.select().from(table).where(and(...filters)).limit(1);
    return rows[0] || null;
  }

  async create(payload: Record<string, unknown>, centerId?: number): Promise<GradesRecord> {
    const data = centerId && centerColumn && !payload.centerId && !payload.center_id
      ? { ...payload, centerId }
      : payload;
    const rows = await this.db.insert(table).values(data).returning();
    return rows[0];
  }

  async update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<GradesRecord | null> {
    const filters = [eq(pk, id)];
    if (centerId && centerColumn) filters.push(eq(centerColumn, centerId));
    const setData = updatedAtColumn
      ? { ...payload, updatedAt: sql`CURRENT_TIMESTAMP` }
      : payload;
    const rows = await this.db.update(table).set(setData).where(and(...filters)).returning();
    return rows[0] || null;
  }

  async delete(id: number, centerId?: number): Promise<GradesRecord | null> {
    const filters = [eq(pk, id)];
    if (centerId && centerColumn) filters.push(eq(centerColumn, centerId));
    const rows = await this.db.delete(table).where(and(...filters)).returning();
    return rows[0] || null;
  }
}

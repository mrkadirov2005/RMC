import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { Pool } from 'pg';

const poolModule = require('../db/pool');
const schema = require('../db/schema');

const tableMap: Record<string, any> = {
  students: schema.students,
};

const primaryKeyMap: Record<string, string> = {
  students: 'studentId',
};

const camelToSnake = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const snakeToCamel = (key: string) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const toSnakeRow = (row: any) =>
  Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [camelToSnake(key), value]));

const getTable = (table: string) => {
  const target = tableMap[table];
  if (!target) throw new Error(`Unsupported table for Drizzle BaseService: ${table}`);
  return target;
};

const getColumn = (target: any, key: string) => target[key] || target[snakeToCamel(key)];

// Base service class for common database operations
export abstract class BaseService {
  protected pool: Pool;
  protected db: any;

  constructor(pool: Pool) {
    this.pool = pool;
    this.db = (pool as any).db || poolModule.db;
  }

  // Generic find by ID
  protected async findById(table: string, id: number, columns: string = '*'): Promise<any> {
    const target = getTable(table);
    const rows = await this.db
      .select()
      .from(target)
      .where(eq(target[primaryKeyMap[table]], id))
      .limit(1);
    return rows[0] ? toSnakeRow(rows[0]) : null;
  }

  // Generic find all with optional filters
  protected async findAll(
    table: string,
    filters: Record<string, any> = {},
    columns: string = '*',
    orderBy: string = 'id DESC'
  ): Promise<any[]> {
    const target = getTable(table);
    const conditions = Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => eq(getColumn(target, key), value));
    const [orderColumn = primaryKeyMap[table], direction = 'DESC'] = orderBy.split(/\s+/);
    const drizzleOrderColumn =
      orderColumn === 'id' ? target[primaryKeyMap[table]] : getColumn(target, orderColumn) || target[primaryKeyMap[table]];
    const query = this.db.select().from(target);
    const rows = await (conditions.length ? query.where(and(...conditions)) : query).orderBy(
      String(direction).toUpperCase() === 'ASC' ? asc(drizzleOrderColumn) : desc(drizzleOrderColumn)
    );
    return rows.map(toSnakeRow);
  }

  // Generic create
  protected async create(table: string, data: Record<string, any>): Promise<any> {
    const target = getTable(table);
    const values = Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [snakeToCamel(key), value])
    );
    const rows = await this.db.insert(target).values(values).returning();
    return toSnakeRow(rows[0]);
  }

  // Generic update
  protected async update(table: string, id: number, data: Record<string, any>): Promise<any> {
    const target = getTable(table);
    const values = Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [snakeToCamel(key), value])
    );
    const rows = await this.db
      .update(target)
      .set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(target[primaryKeyMap[table]], id))
      .returning();
    return rows[0] ? toSnakeRow(rows[0]) : null;
  }

  // Generic delete
  protected async delete(table: string, id: number): Promise<boolean> {
    const target = getTable(table);
    const rows = await this.db.delete(target).where(eq(target[primaryKeyMap[table]], id)).returning({
      id: target[primaryKeyMap[table]],
    });
    return rows.length > 0;
  }

  // Generic count
  protected async count(table: string, filters: Record<string, any> = {}): Promise<number> {
    const target = getTable(table);
    const conditions = Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => eq(getColumn(target, key), value));
    const query = this.db.select({ count: sql`COUNT(*)::int` }).from(target);
    const rows = await (conditions.length ? query.where(and(...conditions)) : query);
    return Number(rows[0]?.count || 0);
  }

  // Transaction helper
  protected async withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }
}

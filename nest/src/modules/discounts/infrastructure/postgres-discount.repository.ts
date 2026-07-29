import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, lte, or, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { discounts } from '../../../database/schema';
import type { Queryable } from '../../../database/transaction.runner';
import type { Discount } from '../domain/discount.entity';
import type { DiscountFilters, DiscountRepositoryPort } from '../domain/discount.repository.port';

@Injectable()
export class PostgresDiscountRepository implements DiscountRepositoryPort {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async findAll(filters: DiscountFilters): Promise<Discount[]> {
    const conditions: any[] = [];
    if (filters.studentId) conditions.push(eq(discounts.studentId, filters.studentId));
    if (filters.centerId) conditions.push(eq(discounts.centerId, filters.centerId));
    if (filters.active !== undefined) conditions.push(eq(discounts.active, filters.active));
    if (filters.discountKind) conditions.push(eq(discounts.discountKind, filters.discountKind));
    let builder = this.db.select(this.discountSelection()).from(discounts).orderBy(desc(discounts.createdAt));
    if (conditions.length) builder = builder.where(and(...conditions));
    return builder;
  }

  async findById(id: number, centerId?: number): Promise<Discount | null> {
    const conditions = [eq(discounts.discountId, id)];
    if (centerId) conditions.push(eq(discounts.centerId, centerId));
    const rows = await this.db.select(this.discountSelection()).from(discounts).where(and(...conditions)).limit(1);
    return rows[0] || null;
  }

  async findActiveByStudent(studentId: number, centerId?: number, discountKind?: string): Promise<Discount | null> {
    const conditions: any[] = [
      eq(discounts.studentId, studentId),
      eq(discounts.active, true),
      or(sql`${discounts.startDate} IS NULL`, lte(discounts.startDate, sql`CURRENT_DATE`)),
      or(sql`${discounts.endDate} IS NULL`, sql`${discounts.endDate} >= CURRENT_DATE`),
    ];
    if (centerId) conditions.push(eq(discounts.centerId, centerId));
    if (discountKind) conditions.push(eq(discounts.discountKind, discountKind));
    const rows = await this.db
      .select(this.discountSelection())
      .from(discounts)
      .where(and(...conditions))
      .orderBy(sql`CASE ${discounts.discountKind} WHEN 'serial_discount' THEN 1 ELSE 2 END`, desc(discounts.createdAt))
      .limit(1);
    return rows[0] || null;
  }

  async insert(payload: Partial<Discount>, queryable?: Queryable): Promise<Discount> {
    const db = queryable || this.db;
    const rows = await db
      .insert(discounts)
      .values({
        studentId: payload.student_id,
        centerId: payload.center_id,
        discountType: payload.discount_type || 'fixed',
        discountKind: payload.discount_kind || 'serial_discount',
        value: payload.value || 0,
        originalPrice: payload.original_price ?? null,
        finalPrice: payload.final_price ?? null,
        reason: payload.reason ?? null,
        paymentPeriod: payload.payment_period ?? null,
        startDate: payload.start_date ?? null,
        endDate: payload.end_date ?? null,
        active: payload.active ?? true,
      })
      .returning(this.discountSelection());
    return rows[0];
  }

  async update(id: number, payload: Partial<Discount>, centerId?: number, queryable?: Queryable): Promise<Discount | null> {
    const db = queryable || this.db;
    const conditions = [eq(discounts.discountId, id)];
    if (centerId) conditions.push(eq(discounts.centerId, centerId));
    const rows = await db
      .update(discounts)
      .set({
        discountType: sql`COALESCE(${payload.discount_type ?? null}, ${discounts.discountType})`,
        discountKind: sql`COALESCE(${payload.discount_kind ?? null}, ${discounts.discountKind})`,
        value: sql`COALESCE(${payload.value ?? null}, ${discounts.value})`,
        originalPrice: sql`COALESCE(${payload.original_price ?? null}, ${discounts.originalPrice})`,
        finalPrice: sql`COALESCE(${payload.final_price ?? null}, ${discounts.finalPrice})`,
        reason: sql`COALESCE(${payload.reason ?? null}, ${discounts.reason})`,
        paymentPeriod: sql`COALESCE(${payload.payment_period ?? null}, ${discounts.paymentPeriod})`,
        startDate: sql`COALESCE(${payload.start_date ?? null}, ${discounts.startDate})`,
        endDate: sql`COALESCE(${payload.end_date ?? null}, ${discounts.endDate})`,
        active: sql`COALESCE(${payload.active ?? null}, ${discounts.active})`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(...conditions))
      .returning(this.discountSelection());
    return rows[0] || null;
  }

  async delete(id: number, centerId?: number): Promise<Discount | null> {
    const conditions = [eq(discounts.discountId, id)];
    if (centerId) conditions.push(eq(discounts.centerId, centerId));
    const rows = await this.db.delete(discounts).where(and(...conditions)).returning(this.discountSelection());
    return rows[0] || null;
  }

  private discountSelection() {
    return {
      discount_id: discounts.discountId,
      student_id: discounts.studentId,
      center_id: discounts.centerId,
      discount_type: discounts.discountType,
      discount_kind: discounts.discountKind,
      value: discounts.value,
      original_price: discounts.originalPrice,
      final_price: discounts.finalPrice,
      reason: discounts.reason,
      payment_period: discounts.paymentPeriod,
      start_date: discounts.startDate,
      end_date: discounts.endDate,
      active: discounts.active,
      created_at: discounts.createdAt,
      updated_at: discounts.updatedAt,
    };
  }
}

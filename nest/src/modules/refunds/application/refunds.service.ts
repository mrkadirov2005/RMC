import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { payments, refunds } from '../../../database/schema';

@Injectable()
export class RefundsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async list(query: any, centerId?: number) {
    const conditions: any[] = [];
    if (query.payment_id) {
      conditions.push(eq(refunds.paymentId, Number(query.payment_id)));
    }
    if (query.status) {
      conditions.push(eq(refunds.status, query.status));
    }
    if (centerId) {
      const scopedPayments = await this.db
        .select({ paymentId: payments.paymentId })
        .from(payments)
        .where(and(eq(payments.centerId, centerId), isNull(payments.deletedAt)));
      const paymentIds = scopedPayments.map((payment: any) => payment.paymentId);
      if (paymentIds.length === 0) return [];
      conditions.push(inArray(refunds.paymentId, paymentIds));
    }
    let builder = this.db.select().from(refunds).orderBy(desc(refunds.createdAt));
    if (conditions.length) builder = builder.where(and(...conditions));
    return builder;
  }

  async getById(id: number, centerId?: number) {
    const row = await this.findById(id);
    if (!row) throw new NotFoundException('Refund not found');
    if (centerId && !(await this.paymentInCenter(row.payment_id, centerId))) throw new NotFoundException('Refund not found');
    return row;
  }

  async create(body: any, centerId?: number) {
    if (centerId && !(await this.paymentInCenter(Number(body.payment_id), centerId))) {
      throw new BadRequestException('Payment does not belong to this center.');
    }
    const rows = await this.db
      .insert(refunds)
      .values({ paymentId: Number(body.payment_id), amount: body.amount, reason: body.reason || null })
      .returning();
    return { message: 'Refund requested', refund: rows[0] };
  }

  async update(id: number, body: any, centerId?: number) {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Refund not found');
    if (centerId && !(await this.paymentInCenter(existing.payment_id, centerId))) throw new NotFoundException('Refund not found');
    const row = await this.db.transaction(async (tx: any) => {
      const changes: any = { updatedAt: sql`CURRENT_TIMESTAMP` };
      if (body.status !== undefined) changes.status = body.status;
      if (body.refunded_at !== undefined) changes.refundedAt = body.refunded_at;
      const rows = await tx.update(refunds).set(changes).where(eq(refunds.refundId, id)).returning();
      if (rows[0] && body.status === 'Processed') {
        await tx
          .update(payments)
          .set({ paymentStatus: 'Refunded', updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(and(eq(payments.paymentId, rows[0].paymentId), isNull(payments.deletedAt)));
      }
      return rows[0];
    });
    return { message: 'Refund updated', refund: row };
  }

  async remove(id: number, centerId?: number) {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Refund not found');
    if (centerId && !(await this.paymentInCenter(existing.payment_id, centerId))) throw new NotFoundException('Refund not found');
    const rows = await this.db.delete(refunds).where(eq(refunds.refundId, id)).returning();
    return { message: 'Refund deleted', refund: rows[0] };
  }

  private async findById(id: number) {
    const rows = await this.db.select().from(refunds).where(eq(refunds.refundId, id)).limit(1);
    return rows[0] || null;
  }

  private async paymentInCenter(paymentId: number, centerId: number) {
    const rows = await this.db
      .select({ paymentId: payments.paymentId })
      .from(payments)
      .where(and(eq(payments.paymentId, paymentId), eq(payments.centerId, centerId), isNull(payments.deletedAt)))
      .limit(1);
    return Boolean(rows[0]);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { classes, payments, students } from '../../../database/schema';
import type { Queryable } from '../../../database/transaction.runner';
import type { Payment } from '../domain/payment.entity';
import type { PaymentListOptions, PaymentRepositoryPort } from '../domain/payment.repository.port';

@Injectable()
export class PostgresPaymentRepository implements PaymentRepositoryPort {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async findAll(options: PaymentListOptions = {}): Promise<Payment[]> {
    const conditions: any[] = [isNull(payments.deletedAt)];
    if (options.teacherId) {
      conditions.push(sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${options.teacherId}`);
      conditions.push(or(isNull(students.deletedAt), eq(students.status, 'Transferred')));
    }
    if (options.centerId) conditions.push(eq(payments.centerId, options.centerId));
    if (options.studentId) conditions.push(eq(payments.studentId, options.studentId));
    let builder = this.db
      .select(this.paymentListSelection())
      .from(payments)
      .leftJoin(students, eq(students.studentId, payments.studentId))
      .leftJoin(classes, eq(classes.classId, students.classId))
      .where(and(...conditions))
      .orderBy(desc(payments.paymentId));
    if (options.limit) builder = builder.limit(options.limit);
    if (options.offset) builder = builder.offset(options.offset);
    return builder;
  }

  async findById(id: number, centerId?: number, teacherId?: number): Promise<Payment | null> {
    return this.findScopedPayment(id, true, centerId, teacherId);
  }

  async insert(params: any[], queryable?: Queryable): Promise<Payment> {
    const db = queryable || this.db;
    const rows = await db
      .insert(payments)
      .values({
        studentId: params[0],
        centerId: params[1],
        paymentDate: params[2],
        amount: params[3],
        currency: params[4],
        paymentMethod: params[5],
        transactionReference: params[6],
        receiptNumber: params[7],
        paymentStatus: params[8],
        paymentType: params[9],
        notes: params[10],
        discountId: params[11],
        discountKind: params[12],
        discountValueType: params[13],
        discountValue: params[14],
        originalAmount: params[15],
        discountAmount: params[16],
        finalAmount: params[17],
        isComplete: params[18],
      })
      .returning(this.paymentSelection());
    return rows[0];
  }

  async update(id: number, params: any[], centerId?: number, teacherId?: number): Promise<Payment | null> {
    const existing = await this.findById(id, centerId, teacherId);
    if (!existing) return null;
    const rows = await this.db
      .update(payments)
      .set({
        amount: sql`COALESCE(${params[0] ?? null}, ${payments.amount})`,
        paymentStatus: sql`COALESCE(${params[1] ?? null}, ${payments.paymentStatus})`,
        notes: sql`COALESCE(${params[2] ?? null}, ${payments.notes})`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(payments.paymentId, id), isNull(payments.deletedAt)))
      .returning(this.paymentSelection());
    return rows[0] || null;
  }

  async findByStudent(studentId: number, centerId?: number, teacherId?: number): Promise<Payment[]> {
    const conditions: any[] = [eq(payments.studentId, studentId), isNull(payments.deletedAt)];
    if (centerId) conditions.push(eq(payments.centerId, centerId));
    if (teacherId) conditions.push(sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${teacherId}`);
    return this.db
      .select(this.paymentSelection())
      .from(payments)
      .leftJoin(students, eq(students.studentId, payments.studentId))
      .leftJoin(classes, eq(classes.classId, students.classId))
      .where(and(...conditions))
      .orderBy(desc(payments.paymentDate), desc(payments.paymentId));
  }

  async softDelete(id: number, centerId?: number, teacherId?: number): Promise<Payment | null> {
    return this.mutateDelete(id, false, centerId, teacherId);
  }

  async purge(id: number, centerId?: number, teacherId?: number): Promise<Payment | null> {
    return this.mutateDelete(id, true, centerId, teacherId);
  }

  private async mutateDelete(id: number, hard: boolean, centerId?: number, teacherId?: number): Promise<Payment | null> {
    const existing = await this.findScopedPayment(id, !hard, centerId, teacherId);
    if (!existing) return null;
    if (hard) {
      const rows = await this.db.delete(payments).where(and(eq(payments.paymentId, id), isNotNull(payments.deletedAt))).returning(this.paymentSelection());
      return rows[0] || null;
    }
    const rows = await this.db
      .update(payments)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(payments.paymentId, id), isNull(payments.deletedAt)))
      .returning(this.paymentSelection());
    return rows[0] || null;
  }

  private async findScopedPayment(id: number, active: boolean, centerId?: number, teacherId?: number): Promise<Payment | null> {
    const conditions: any[] = [eq(payments.paymentId, id), active ? isNull(payments.deletedAt) : isNotNull(payments.deletedAt)];
    if (centerId) conditions.push(eq(payments.centerId, centerId));
    if (teacherId) conditions.push(sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${teacherId}`);
    const rows = await this.db
      .select(this.paymentSelection())
      .from(payments)
      .leftJoin(students, eq(students.studentId, payments.studentId))
      .leftJoin(classes, eq(classes.classId, students.classId))
      .where(and(...conditions))
      .limit(1);
    return rows[0] || null;
  }

  private paymentSelection() {
    return {
      payment_id: payments.paymentId,
      student_id: payments.studentId,
      center_id: payments.centerId,
      payment_date: payments.paymentDate,
      amount: payments.amount,
      currency: payments.currency,
      payment_method: payments.paymentMethod,
      transaction_reference: payments.transactionReference,
      receipt_number: payments.receiptNumber,
      payment_status: payments.paymentStatus,
      payment_type: payments.paymentType,
      notes: payments.notes,
      discount_id: payments.discountId,
      discount_kind: payments.discountKind,
      discount_value_type: payments.discountValueType,
      discount_value: payments.discountValue,
      original_amount: payments.originalAmount,
      discount_amount: payments.discountAmount,
      final_amount: payments.finalAmount,
      is_complete: payments.isComplete,
      deleted_at: payments.deletedAt,
      created_at: payments.createdAt,
      updated_at: payments.updatedAt,
    };
  }

  private paymentListSelection() {
    return {
      ...this.paymentSelection(),
      student_first_name: students.firstName,
      student_last_name: students.lastName,
      student_class_id: students.classId,
      student_teacher_id: sql`COALESCE(${classes.teacherId}, ${students.teacherId})`,
      student_status: students.status,
      student_deleted_at: students.deletedAt,
      student_class_name: classes.className,
    };
  }
}

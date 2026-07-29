import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { attendance, classes as classesTable, debts as debtsTable, payments as paymentsTable, students as studentsTable, teachers as teachersTable } from '../../../database/schema';

const buildDateRange = (startDate?: string, endDate?: string) => ({
  start: startDate || null,
  end: endDate || null,
});

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async overview(query: any, centerId?: number) {
    const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
    const { start, end } = buildDateRange(query.start_date, query.end_date);
    const scopedConditions = (table: any, ...conditions: any[]) => {
      if (scopedCenterId) conditions.push(eq(table.centerId, scopedCenterId));
      return and(...conditions);
    };
    const students = await this.one(
      this.db
        .select({
          total: sql`COUNT(*)::int`,
          active: sql`SUM(CASE WHEN ${studentsTable.status} = 'Active' THEN 1 ELSE 0 END)::int`,
        })
        .from(studentsTable)
        .where(scopedConditions(studentsTable, isNull(studentsTable.deletedAt))),
    );
    const teachers = await this.one(
      this.db.select({ total: sql`COUNT(*)::int` }).from(teachersTable).where(scopedConditions(teachersTable, isNull(teachersTable.deletedAt))),
    );
    const classes = await this.one(
      this.db.select({ total: sql`COUNT(*)::int` }).from(classesTable).where(scopedConditions(classesTable, isNull(classesTable.deletedAt))),
    );

    const paymentConditions: any[] = [eq(paymentsTable.paymentStatus, 'Completed'), isNull(paymentsTable.deletedAt)];
    if (scopedCenterId) paymentConditions.push(eq(paymentsTable.centerId, scopedCenterId));
    if (start) paymentConditions.push(gte(paymentsTable.paymentDate, start));
    if (end) paymentConditions.push(lte(paymentsTable.paymentDate, end));
    const payments = await this.one(
      this.db
        .select({ total_revenue: sql`COALESCE(SUM(${paymentsTable.amount}),0)::numeric`, payments_count: sql`COUNT(*)::int` })
        .from(paymentsTable)
        .where(and(...paymentConditions)),
    );

    const debtConditions: any[] = [sql`${debtsTable.balance} > 0`];
    if (scopedCenterId) debtConditions.push(eq(debtsTable.centerId, scopedCenterId));
    const debts = await this.one(
      this.db.select({ total_outstanding: sql`COALESCE(SUM(${debtsTable.balance}),0)::numeric` }).from(debtsTable).where(and(...debtConditions)),
    );
    return { students, teachers, classes, payments, debts, period: { start_date: query.start_date || null, end_date: query.end_date || null } };
  }

  async paymentsReport(query: any, centerId?: number) {
    const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
    const { start, end } = buildDateRange(query.start_date, query.end_date);
    const conditions: any[] = [eq(paymentsTable.paymentStatus, 'Completed'), isNull(paymentsTable.deletedAt)];
    if (scopedCenterId) conditions.push(eq(paymentsTable.centerId, scopedCenterId));
    if (start) conditions.push(gte(paymentsTable.paymentDate, start));
    if (end) conditions.push(lte(paymentsTable.paymentDate, end));
    if (query.group_by === 'month') {
      return this.db
        .select({
          year: sql`EXTRACT(YEAR FROM ${paymentsTable.paymentDate})::int`,
          month: sql`EXTRACT(MONTH FROM ${paymentsTable.paymentDate})::int`,
          payments_count: sql`COUNT(*)::int`,
          total_amount: sql`SUM(${paymentsTable.amount})::numeric`,
        })
        .from(paymentsTable)
        .where(and(...conditions))
        .groupBy(sql`EXTRACT(YEAR FROM ${paymentsTable.paymentDate})`, sql`EXTRACT(MONTH FROM ${paymentsTable.paymentDate})`)
        .orderBy(desc(sql`EXTRACT(YEAR FROM ${paymentsTable.paymentDate})`), desc(sql`EXTRACT(MONTH FROM ${paymentsTable.paymentDate})`));
    }
    return this.one(
      this.db
        .select({ payments_count: sql`COUNT(*)::int`, total_amount: sql`COALESCE(SUM(${paymentsTable.amount}),0)::numeric` })
        .from(paymentsTable)
        .where(and(...conditions)),
    );
  }

  async attendanceReport(query: any, centerId?: number) {
    const { start, end } = buildDateRange(query.start_date, query.end_date);
    const conditions: any[] = [];
    if (centerId) conditions.push(eq(attendance.centerId, centerId));
    if (query.class_id) conditions.push(eq(attendance.classId, Number(query.class_id)));
    if (start) conditions.push(gte(attendance.attendanceDate, start));
    if (end) conditions.push(lte(attendance.attendanceDate, end));
    let builder = this.db.select({ status: attendance.status, count: sql`COUNT(*)::int` }).from(attendance).groupBy(attendance.status);
    if (conditions.length) builder = builder.where(and(...conditions));
    return builder;
  }

  private async one(query: Promise<any[]>) {
    const rows = await query;
    return rows[0];
  }
}

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');

const modules = [
  { name: 'archive', tableExport: 'students', pkProp: 'studentId' },
  { name: 'assignments', tableExport: 'assignments', pkProp: 'assignmentId' },
  { name: 'attendance', tableExport: 'attendance', pkProp: 'attendanceId' },
  { name: 'audit-logs', tableExport: 'auditLogs', pkProp: 'auditLogId' },
  { name: 'centers', tableExport: 'centers', pkProp: 'centerId' },
  { name: 'classes', tableExport: 'classes', pkProp: 'classId' },
  { name: 'debts', tableExport: 'debts', pkProp: 'debtId' },
  { name: 'grades', tableExport: 'grades', pkProp: 'gradeId' },
  { name: 'import-export', tableExport: 'importJobs', pkProp: 'importJobId' },
  { name: 'invoices', tableExport: 'invoices', pkProp: 'invoiceId' },
  { name: 'notifications', tableExport: 'notifications', pkProp: 'notificationId' },
  { name: 'owners', tableExport: 'owners', pkProp: 'ownerId' },
  { name: 'parents', tableExport: 'parents', pkProp: 'parentId' },
  { name: 'payment-plans', tableExport: 'paymentPlans', pkProp: 'planId' },
  { name: 'portal', tableExport: 'students', pkProp: 'studentId' },
  { name: 'refunds', tableExport: 'refunds', pkProp: 'refundId' },
  { name: 'reports', tableExport: 'payments', pkProp: 'paymentId' },
  { name: 'rooms', tableExport: 'rooms', pkProp: 'roomId' },
  { name: 'room-slots', tableExport: 'roomSlots', pkProp: 'slotId' },
  { name: 'saved-filters', tableExport: 'savedFilters', pkProp: 'filterId' },
  { name: 'search', tableExport: 'students', pkProp: 'studentId' },
  { name: 'sessions', tableExport: 'classSessions', pkProp: 'sessionId' },
  { name: 'settings', tableExport: 'appSettings', pkProp: 'settingId' },
  { name: 'subjects', tableExport: 'subjects', pkProp: 'subjectId' },
  { name: 'superusers', tableExport: 'superusers', pkProp: 'superuserId' },
  { name: 'system', tableExport: 'requestLogs', pkProp: 'logId' },
  { name: 'teachers', tableExport: 'teachers', pkProp: 'teacherId' },
  { name: 'telegram-registrations', tableExport: 'telegramRegistrations', pkProp: 'registrationId' },
  { name: 'telegram-students', tableExport: 'telegramStudents', pkProp: 'telegramStudentId' },
  { name: 'tests', tableExport: 'tests', pkProp: 'testId' },
  { name: 'translations', tableExport: 'translations', pkProp: 'id' },
];

const pascal = (value) => value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');

for (const mod of modules) {
  const P = pascal(mod.name);
  const file = path.join(src, `modules/${mod.name}/infrastructure/postgres-${mod.name}.repository.ts`);
  const content = `
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { ${mod.tableExport} } from '../../../database/schema';
import type { ${P}Record } from '../domain/${mod.name}.entity';
import type { ${P}RepositoryPort } from '../domain/${mod.name}.repository.port';

const table: any = ${mod.tableExport};
const pk: any = table.${mod.pkProp};
const centerColumn: any = table.centerId;
const updatedAtColumn: any = table.updatedAt;

@Injectable()
export class Postgres${P}Repository implements ${P}RepositoryPort {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async findAll(centerId?: number): Promise<${P}Record[]> {
    const query = this.db.select().from(table);
    const rows = centerId && centerColumn
      ? await query.where(eq(centerColumn, centerId)).orderBy(desc(pk))
      : await query.orderBy(desc(pk));
    return rows;
  }

  async findById(id: number, centerId?: number): Promise<${P}Record | null> {
    const filters = [eq(pk, id)];
    if (centerId && centerColumn) filters.push(eq(centerColumn, centerId));
    const rows = await this.db.select().from(table).where(and(...filters)).limit(1);
    return rows[0] || null;
  }

  async create(payload: Record<string, unknown>, centerId?: number): Promise<${P}Record> {
    const data = centerId && centerColumn && !payload.centerId && !payload.center_id
      ? { ...payload, centerId }
      : payload;
    const rows = await this.db.insert(table).values(data).returning();
    return rows[0];
  }

  async update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<${P}Record | null> {
    const filters = [eq(pk, id)];
    if (centerId && centerColumn) filters.push(eq(centerColumn, centerId));
    const setData = updatedAtColumn
      ? { ...payload, updatedAt: sql\`CURRENT_TIMESTAMP\` }
      : payload;
    const rows = await this.db.update(table).set(setData).where(and(...filters)).returning();
    return rows[0] || null;
  }

  async delete(id: number, centerId?: number): Promise<${P}Record | null> {
    const filters = [eq(pk, id)];
    if (centerId && centerColumn) filters.push(eq(centerColumn, centerId));
    const rows = await this.db.delete(table).where(and(...filters)).returning();
    return rows[0] || null;
  }
}
`;
  fs.writeFileSync(file, content.trimStart());
}

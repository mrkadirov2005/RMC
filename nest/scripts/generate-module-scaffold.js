const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');

const modules = [
  { name: 'archive', route: 'archive', table: 'students', pk: 'student_id' },
  { name: 'assignments', route: 'assignments', table: 'assignments', pk: 'assignment_id' },
  { name: 'attendance', route: 'attendance', table: 'attendance', pk: 'attendance_id' },
  { name: 'audit-logs', route: 'audit-logs', table: 'audit_logs', pk: 'audit_log_id' },
  { name: 'centers', route: 'centers', table: 'edu_centers', pk: 'center_id' },
  { name: 'classes', route: 'classes', table: 'classes', pk: 'class_id' },
  { name: 'debts', route: 'debts', table: 'debts', pk: 'debt_id' },
  { name: 'grades', route: 'grades', table: 'grades', pk: 'grade_id' },
  { name: 'import-export', route: 'import-export', table: 'import_jobs', pk: 'import_job_id' },
  { name: 'invoices', route: 'invoices', table: 'invoices', pk: 'invoice_id' },
  { name: 'notifications', route: 'notifications', table: 'notifications', pk: 'notification_id' },
  { name: 'owners', route: 'owners', table: 'owners', pk: 'owner_id' },
  { name: 'parents', route: 'parents', table: 'parents', pk: 'parent_id' },
  { name: 'payment-plans', route: 'payment-plans', table: 'payment_plans', pk: 'plan_id' },
  { name: 'portal', route: 'portal', table: 'students', pk: 'student_id', readonly: true },
  { name: 'refunds', route: 'refunds', table: 'refunds', pk: 'refund_id' },
  { name: 'reports', route: 'reports', table: 'payments', pk: 'payment_id', readonly: true },
  { name: 'rooms', route: 'rooms', table: 'rooms', pk: 'room_id' },
  { name: 'room-slots', route: 'room-slots', table: 'room_slots', pk: 'slot_id' },
  { name: 'saved-filters', route: 'saved-filters', table: 'saved_filters', pk: 'filter_id' },
  { name: 'search', route: 'search', table: 'students', pk: 'student_id', readonly: true },
  { name: 'sessions', route: 'sessions', table: 'class_sessions', pk: 'session_id' },
  { name: 'settings', route: 'settings', table: 'app_settings', pk: 'setting_id' },
  { name: 'subjects', route: 'subjects', table: 'subjects', pk: 'subject_id' },
  { name: 'superusers', route: 'superusers', table: 'superusers', pk: 'superuser_id' },
  { name: 'system', route: 'system', table: 'request_logs', pk: 'log_id', readonly: true },
  { name: 'teachers', route: 'teachers', table: 'teachers', pk: 'teacher_id' },
  { name: 'telegram-registrations', route: 'telegram-registrations', table: 'telegram_registrations', pk: 'registration_id' },
  { name: 'telegram-students', route: 'telegram-students', table: 'telegram_students', pk: 'telegram_student_id' },
  { name: 'tests', route: 'tests', table: 'tests', pk: 'test_id' },
  { name: 'translations', route: 'translations', table: 'translations', pk: 'id' },
];

const pascal = (value) => value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
const camel = (value) => {
  const p = pascal(value);
  return p.charAt(0).toLowerCase() + p.slice(1);
};
const snakeToCamel = (value) => value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const write = (relative, contents) => {
  const file = path.join(src, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents.trimStart());
};

for (const mod of modules) {
  const P = pascal(mod.name);
  const c = camel(mod.name);
  const dir = `modules/${mod.name}`;
  const token = `${mod.name.toUpperCase().replace(/-/g, '_')}_REPOSITORY`;
  const pkProperty = snakeToCamel(mod.pk);

  write(`${dir}/domain/${mod.name}.entity.ts`, `
export interface ${P}Record {
  [key: string]: unknown;
}
`);

  write(`${dir}/domain/${mod.name}.repository.port.ts`, `
import type { ${P}Record } from './${mod.name}.entity';

export const ${token} = Symbol('${token}');

export interface ${P}RepositoryPort {
  findAll(centerId?: number): Promise<${P}Record[]>;
  findById(id: number, centerId?: number): Promise<${P}Record | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<${P}Record>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<${P}Record | null>;
  delete(id: number, centerId?: number): Promise<${P}Record | null>;
}
`);

  write(`${dir}/infrastructure/postgres-${mod.name}.repository.ts`, `
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { schemaTables } from '../../../database/schema';
import type { ${P}Record } from '../domain/${mod.name}.entity';
import type { ${P}RepositoryPort } from '../domain/${mod.name}.repository.port';

const table: any = schemaTables['${mod.table}'];
const pk: any = table.${pkProperty};
const centerColumn: any = table.centerId;
const updatedAtColumn: any = table.updatedAt;

@Injectable()
export class Postgres${P}Repository implements ${P}RepositoryPort {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async findAll(centerId?: number): Promise<${P}Record[]> {
    const query = this.db.select().from(table);
    return centerId && centerColumn
      ? query.where(eq(centerColumn, centerId)).orderBy(desc(pk))
      : query.orderBy(desc(pk));
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
`);

  write(`${dir}/application/${mod.name}.service.ts`, `
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ${token}, type ${P}RepositoryPort } from '../domain/${mod.name}.repository.port';

@Injectable()
export class ${P}Service {
  constructor(@Inject(${token}) private readonly repository: ${P}RepositoryPort) {}

  list(centerId?: number) {
    return this.repository.findAll(centerId);
  }

  async get(id: number, centerId?: number) {
    const row = await this.repository.findById(id, centerId);
    if (!row) throw new NotFoundException('${P} record not found');
    return row;
  }

  create(payload: Record<string, unknown>, centerId?: number) {
    return this.repository.create(payload, centerId);
  }

  async update(id: number, payload: Record<string, unknown>, centerId?: number) {
    const row = await this.repository.update(id, payload, centerId);
    if (!row) throw new NotFoundException('${P} record not found');
    return row;
  }

  async remove(id: number, centerId?: number) {
    const row = await this.repository.delete(id, centerId);
    if (!row) throw new NotFoundException('${P} record not found');
    return row;
  }
}
`);

  write(`${dir}/interfaces/${mod.name}.controller.ts`, `
import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { ${P}Service } from '../application/${mod.name}.service';

@Controller('${mod.route}')
export class ${P}Controller {
  constructor(private readonly service: ${P}Service) {}

  @Get()
  list(@Req() req: Request & { user?: any }) {
    const scope = getTenantScope(req);
    return this.service.list(scope.centerId);
  }

  @Get(':id')
  get(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req);
    return this.service.get(Number(id), scope.centerId);
  }
${mod.readonly ? '' : `
  @Post()
  create(@Req() req: Request & { user?: any }, @Body() body: Record<string, unknown>) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.service.create(body, scope.centerId);
  }

  @Put(':id')
  update(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const scope = getTenantScope(req);
    return this.service.update(Number(id), body, scope.centerId);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req);
    return this.service.remove(Number(id), scope.centerId);
  }
`}
}
`);

  write(`${dir}/${mod.name}.module.ts`, `
import { Module } from '@nestjs/common';
import { ${P}Service } from './application/${mod.name}.service';
import { ${token} } from './domain/${mod.name}.repository.port';
import { Postgres${P}Repository } from './infrastructure/postgres-${mod.name}.repository';
import { ${P}Controller } from './interfaces/${mod.name}.controller';

@Module({
  controllers: [${P}Controller],
  providers: [
    ${P}Service,
    { provide: ${token}, useClass: Postgres${P}Repository },
  ],
  exports: [${P}Service],
})
export class ${P}Module {}
`);
}

const imports = modules.map((mod) => `import { ${pascal(mod.name)}Module } from './modules/${mod.name}/${mod.name}.module';`).join('\n');
const moduleNames = modules.map((mod) => `    ${pascal(mod.name)}Module,`).join('\n');
const appModule = `
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/auth.guard';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { StudentsModule } from './modules/students/students.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { PaymentsModule } from './modules/payments/payments.module';
${imports}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    StudentsModule,
    DiscountsModule,
    PaymentsModule,
${moduleNames}
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
`;

fs.writeFileSync(path.join(src, 'app.module.ts'), appModule.trimStart());

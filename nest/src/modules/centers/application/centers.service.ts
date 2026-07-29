import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { centers, classes, payments, students, teachers } from '../../../database/schema';

const isCenterAdmin = (user?: any) => Boolean(user?.center_id && user?.userType !== 'owner');

@Injectable()
export class CentersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  listCenters(user?: any) {
    return this.findAll(isCenterAdmin(user) ? user.center_id : undefined);
  }

  async getCenter(id: number, user?: any) {
    if (isCenterAdmin(user) && Number(user.center_id) !== id) throw new ForbiddenException('Center scope required.');
    const row = await this.findById(id, isCenterAdmin(user) ? user.center_id : undefined);
    if (!row) throw new NotFoundException('Center not found');
    return row;
  }

  getCenterSummaries(user?: any) {
    return this.summaries(isCenterAdmin(user) ? user.center_id : undefined);
  }

  async createCenter(body: any, user?: any) {
    if (isCenterAdmin(user)) throw new ForbiddenException('Admin users cannot create centers.');
    const rows = await this.db
      .insert(centers)
      .values({
        centerName: body.center_name,
        centerCode: body.center_code,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        principalName: body.principal_name,
      })
      .returning();
    return rows[0];
  }

  async updateCenter(id: number, body: any, user?: any) {
    if (isCenterAdmin(user) && Number(user.center_id) !== id) throw new ForbiddenException('Center scope required.');
    const rows = await this.db
      .update(centers)
      .set({
        centerName: sql`COALESCE(${body.center_name ?? null}, ${centers.centerName})`,
        email: sql`COALESCE(${body.email ?? null}, ${centers.email})`,
        phone: sql`COALESCE(${body.phone ?? null}, ${centers.phone})`,
        address: sql`COALESCE(${body.address ?? null}, ${centers.address})`,
        city: sql`COALESCE(${body.city ?? null}, ${centers.city})`,
        principalName: sql`COALESCE(${body.principal_name ?? null}, ${centers.principalName})`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(centers.centerId, id))
      .returning();
    if (!rows[0]) throw new NotFoundException('Center not found');
    return rows[0];
  }

  async deleteCenter(id: number, user?: any) {
    if (isCenterAdmin(user)) throw new ForbiddenException('Admin users cannot delete centers.');
    const rows = await this.db.delete(centers).where(eq(centers.centerId, id)).returning();
    if (!rows[0]) throw new NotFoundException('Center not found');
    return { message: 'Center deleted successfully', center: rows[0] };
  }

  private async findAll(centerId?: number) {
    let builder = this.db.select().from(centers).orderBy(asc(centers.centerId));
    if (centerId) builder = builder.where(eq(centers.centerId, centerId));
    return builder;
  }

  private async findById(id: number, centerId?: number) {
    const condition = centerId ? and(eq(centers.centerId, id), eq(centers.centerId, centerId)) : eq(centers.centerId, id);
    const rows = await this.db.select().from(centers).where(condition).limit(1);
    return rows[0] || null;
  }

  private async summaries(centerId?: number) {
    let builder = this.db
      .select({
        center_id: centers.centerId,
        students: sql`(SELECT COUNT(*)::int FROM ${students} s WHERE s.center_id = ${centers.centerId} AND s.deleted_at IS NULL)`,
        teachers: sql`(SELECT COUNT(*)::int FROM ${teachers} t WHERE t.center_id = ${centers.centerId} AND t.deleted_at IS NULL)`,
        classes: sql`(SELECT COUNT(*)::int FROM ${classes} c WHERE c.center_id = ${centers.centerId} AND c.deleted_at IS NULL)`,
        payments: sql`(SELECT COUNT(*)::int FROM ${payments} p WHERE p.center_id = ${centers.centerId} AND p.deleted_at IS NULL)`,
        collected: sql`(
          SELECT COALESCE(SUM(CASE WHEN LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid') THEN COALESCE(p.amount, 0) ELSE 0 END), 0)::numeric
          FROM ${payments} p
          WHERE p.center_id = ${centers.centerId} AND p.deleted_at IS NULL
        )`,
      })
      .from(centers)
      .orderBy(asc(centers.centerId));
    if (centerId) builder = builder.where(eq(centers.centerId, centerId));
    return builder;
  }
}

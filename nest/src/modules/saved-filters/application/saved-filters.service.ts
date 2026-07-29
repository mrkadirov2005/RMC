import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { savedFilters } from '../../../database/schema';

@Injectable()
export class SavedFiltersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  requireIdentity(userType?: string, userId?: number) {
    if (!userType || !userId) throw new UnauthorizedException('Authentication required.');
  }

  async listMine(userType: string, userId: number, centerId: number, entity?: string) {
    const conditions = [
      eq(savedFilters.userType, userType),
      eq(savedFilters.userId, userId),
      eq(savedFilters.centerId, centerId),
    ];
    if (entity) conditions.push(eq(savedFilters.entity, entity));
    return this.db.select().from(savedFilters).where(and(...conditions)).orderBy(desc(savedFilters.updatedAt));
  }

  async create(userType: string, userId: number, centerId: number, body: any) {
    if (!centerId) throw new BadRequestException('center_id is required for saved filters.');
    const rows = await this.db
      .insert(savedFilters)
      .values({
        centerId,
        userType,
        userId,
        name: body.name,
        entity: body.entity,
        filtersJson: body.filters_json,
      })
      .returning();
    return { message: 'Filter saved', filter: rows[0] };
  }

  async update(id: number, userType: string, userId: number, centerId: number, body: any) {
    const changes: any = { updatedAt: sql`CURRENT_TIMESTAMP` };
    if (body.name !== undefined) changes.name = body.name;
    if (body.filters_json !== undefined) changes.filtersJson = body.filters_json;

    const rows = await this.db
      .update(savedFilters)
      .set(changes)
      .where(
        and(
          eq(savedFilters.filterId, id),
          eq(savedFilters.userType, userType),
          eq(savedFilters.userId, userId),
          eq(savedFilters.centerId, centerId),
        ),
      )
      .returning();
    if (!rows[0]) throw new NotFoundException('Filter not found');
    return { message: 'Filter updated', filter: rows[0] };
  }

  async remove(id: number, userType: string, userId: number, centerId: number) {
    const rows = await this.db
      .delete(savedFilters)
      .where(
        and(
          eq(savedFilters.filterId, id),
          eq(savedFilters.userType, userType),
          eq(savedFilters.userId, userId),
          eq(savedFilters.centerId, centerId),
        ),
      )
      .returning();
    if (!rows[0]) throw new NotFoundException('Filter not found');
    return { message: 'Filter deleted', filter: rows[0] };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { auditLogs } from '../../../database/schema';

@Injectable()
export class AuditLogsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async listLogs(query: any, centerId?: number) {
    const conditions: any[] = [];
    if (query.entity_type) {
      conditions.push(eq(auditLogs.entityType, query.entity_type));
    }
    if (query.entity_id) {
      conditions.push(eq(auditLogs.entityId, Number(query.entity_id)));
    }
    if (query.user_type) {
      conditions.push(eq(auditLogs.userType, query.user_type));
    }
    if (query.user_id) {
      conditions.push(eq(auditLogs.userId, Number(query.user_id)));
    }
    if (centerId) {
      conditions.push(sql`COALESCE(${auditLogs.details}->>'center_id', '') = ${String(centerId)}`);
    }

    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const offset = query.offset ? parseInt(query.offset, 10) : undefined;
    let builder = this.db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
    if (conditions.length > 0) builder = builder.where(and(...conditions));
    if (limit != null) builder = builder.limit(limit);
    if (offset != null) builder = builder.offset(offset);
    return builder;
  }
}

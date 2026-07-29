import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { AuditLogsService } from '../application/audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  list(@Req() req: Request & { user?: any }, @Query() query: any) {
    const scope = getTenantScope(req);
    return this.auditLogsService.listLogs(query, scope.centerId);
  }
}

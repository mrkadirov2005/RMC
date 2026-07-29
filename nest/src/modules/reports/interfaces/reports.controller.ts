import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { ReportsService } from '../application/reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  overview(@Req() req: Request & { user?: any }, @Query() query: any) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.reportsService.overview(query, scope.centerId);
  }

  @Get('payments')
  payments(@Req() req: Request & { user?: any }, @Query() query: any) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.reportsService.paymentsReport(query, scope.centerId);
  }

  @Get('attendance')
  attendance(@Req() req: Request & { user?: any }, @Query() query: any) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.reportsService.attendanceReport(query, scope.centerId);
  }
}

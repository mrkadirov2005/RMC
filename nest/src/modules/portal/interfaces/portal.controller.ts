import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { PortalService } from '../application/portal.service';

@Controller('portal')
export class PortalController {
  constructor(private readonly service: PortalService) {}

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

}

import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { RefundsService } from '../application/refunds.service';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  list(@Req() req: Request & { user?: any }, @Query() query: any) {
    const scope = getTenantScope(req);
    return this.refundsService.list(query, scope.centerId);
  }

  @Get(':id')
  get(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req);
    return this.refundsService.getById(Number(id), scope.centerId);
  }

  @Post()
  create(@Req() req: Request & { user?: any }, @Body() body: any) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.refundsService.create(body, scope.centerId);
  }

  @Put(':id')
  update(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() body: any) {
    const scope = getTenantScope(req);
    return this.refundsService.update(Number(id), body, scope.centerId);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req);
    return this.refundsService.remove(Number(id), scope.centerId);
  }
}

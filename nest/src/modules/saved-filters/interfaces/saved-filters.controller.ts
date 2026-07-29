import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { SavedFiltersService } from '../application/saved-filters.service';

@Controller('saved-filters')
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @Get()
  list(@Req() req: Request & { user?: any }, @Query('entity') entity?: string) {
    this.savedFiltersService.requireIdentity(req.user?.userType, req.user?.id);
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.savedFiltersService.listMine(req.user.userType, req.user.id, Number(scope.centerId), entity);
  }

  @Post()
  create(@Req() req: Request & { user?: any }, @Body() body: any) {
    this.savedFiltersService.requireIdentity(req.user?.userType, req.user?.id);
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.savedFiltersService.create(req.user.userType, req.user.id, Number(scope.centerId), body);
  }

  @Put(':id')
  update(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() body: any) {
    this.savedFiltersService.requireIdentity(req.user?.userType, req.user?.id);
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.savedFiltersService.update(Number(id), req.user.userType, req.user.id, Number(scope.centerId), body);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    this.savedFiltersService.requireIdentity(req.user?.userType, req.user?.id);
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.savedFiltersService.remove(Number(id), req.user.userType, req.user.id, Number(scope.centerId));
  }
}

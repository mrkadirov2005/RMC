import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { NotificationsService } from '../application/notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() req: Request & { user?: any }) {
    this.notificationsService.requireIdentity(req.user?.userType, req.user?.id);
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.notificationsService.listForUser(req.user.userType, req.user.id, scope.centerId);
  }

  @Post()
  create(@Req() req: Request & { user?: any }, @Body() body: any) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.notificationsService.create(body, scope.centerId);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    this.notificationsService.requireIdentity(req.user?.userType, req.user?.id);
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.notificationsService.markAsRead(Number(id), req.user.userType, req.user.id, scope.centerId);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    this.notificationsService.requireIdentity(req.user?.userType, req.user?.id);
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.notificationsService.remove(Number(id), req.user.userType, req.user.id, scope.centerId);
  }
}

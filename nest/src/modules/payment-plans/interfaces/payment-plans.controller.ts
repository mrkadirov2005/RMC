import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { PaymentPlansService } from '../application/payment-plans.service';

@Controller('payment-plans')
export class PaymentPlansController {
  constructor(private readonly service: PaymentPlansService) {}

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

}

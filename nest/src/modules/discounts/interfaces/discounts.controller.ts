import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { DiscountService } from '../application/discount.service';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountService: DiscountService) {}

  @Get()
  list(@Req() req: Request, @Query() query: any) {
    const scope = getTenantScope(req as any);
    return this.discountService.list(query, scope.centerId);
  }

  @Get('student/:studentId/active')
  activeSerial(@Req() req: Request, @Param('studentId') studentId: string) {
    const scope = getTenantScope(req as any);
    return this.discountService.getActiveByStudent(Number(studentId), scope.centerId, 'serial_discount');
  }

  @Get('student/:studentId/active-any')
  activeAny(@Req() req: Request, @Param('studentId') studentId: string, @Query('discount_kind') discountKind?: string) {
    const scope = getTenantScope(req as any);
    return this.discountService.getActiveByStudent(Number(studentId), scope.centerId, discountKind);
  }

  @Get(':id')
  getById(@Req() req: Request, @Param('id') id: string) {
    const scope = getTenantScope(req as any);
    return this.discountService.getById(Number(id), scope.centerId);
  }

  @Post()
  create(@Req() req: Request, @Body() body: CreateDiscountDto) {
    const scope = getTenantScope(req as any, { requireConcreteCenter: true });
    return this.discountService.create(body, scope.centerId);
  }

  @Put(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: UpdateDiscountDto) {
    const scope = getTenantScope(req as any);
    return this.discountService.update(Number(id), body, scope.centerId);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const scope = getTenantScope(req as any);
    return this.discountService.remove(Number(id), scope.centerId);
  }
}

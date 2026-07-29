import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { PaymentService } from '../application/payment.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';

const teacherView = (row: any) => ({
  payment_id: row.payment_id,
  student_id: row.student_id,
  payment_date: row.payment_date,
  payment_status: row.payment_status,
});

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  async list(@Req() req: Request & { user?: any }, @Query() query: any) {
    if (req.user?.userType === 'student') throw new ForbiddenException('Access denied.');
    const scope = getTenantScope(req);
    const limit = query.limit ? Math.min(Number(query.limit), 200) : undefined;
    const page = Number(query.page || 1);
    const rows = await this.paymentService.listPayments({
      centerId: scope.centerId,
      teacherId: scope.teacherId,
      studentId: query.student_id ? Number(query.student_id) : undefined,
      limit,
      offset: limit ? (Math.max(page, 1) - 1) * limit : undefined,
    });
    return req.user?.userType === 'teacher' ? rows.map(teacherView) : rows;
  }

  @Get('student/:studentId')
  async byStudent(@Req() req: Request & { user?: any }, @Param('studentId') studentId: string) {
    const scope = getTenantScope(req);
    const rows = await this.paymentService.listByStudent(Number(studentId), scope.centerId, scope.teacherId);
    return req.user?.userType === 'teacher' ? rows.map(teacherView) : rows;
  }

  @Get(':id')
  async getById(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req);
    const row = await this.paymentService.getPayment(Number(id), scope.centerId, scope.teacherId);
    return req.user?.userType === 'teacher' ? teacherView(row) : row;
  }

  @Post()
  create(@Req() req: Request & { user?: any }, @Body() body: CreatePaymentDto) {
    this.paymentService.assertCanMutate(req.user?.userType);
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.paymentService.createPayment(body, scope.centerId);
  }

  @Put(':id')
  update(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() body: UpdatePaymentDto) {
    this.paymentService.assertCanMutate(req.user?.userType);
    const scope = getTenantScope(req);
    return this.paymentService.updatePayment(Number(id), body, scope.centerId, scope.teacherId);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    this.paymentService.assertCanMutate(req.user?.userType);
    const scope = getTenantScope(req);
    return this.paymentService.deletePayment(Number(id), scope.centerId, scope.teacherId);
  }

  @Delete(':id/purge')
  purge(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    this.paymentService.assertCanMutate(req.user?.userType);
    const scope = getTenantScope(req);
    return this.paymentService.purgePayment(Number(id), scope.centerId, scope.teacherId);
  }
}

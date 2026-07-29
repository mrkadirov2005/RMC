import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRunner } from '../../../database/transaction.runner';
import { DiscountService } from '../../discounts/application/discount.service';
import { PAYMENT_REPOSITORY, type PaymentRepositoryPort } from '../domain/payment.repository.port';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepositoryPort,
    private readonly discounts: DiscountService,
    private readonly transactions: TransactionRunner,
  ) {}

  listPayments(options: { centerId?: number; teacherId?: number; studentId?: number; limit?: number; offset?: number }) {
    return this.payments.findAll(options);
  }

  getPayment(id: number, centerId?: number, teacherId?: number) {
    return this.payments.findById(id, centerId, teacherId);
  }

  async createPayment(body: any, centerId?: number) {
    const scopedCenterId = centerId || body.center_id;
    const paymentDate = body.payment_date || new Date().toISOString().slice(0, 10);
    const originalAmount = Number(body.original_amount ?? body.amount ?? 0);
    let appliedDiscount: any = null;

    if (body.discount_kind === 'monthly_discount' && Number(body.discount_value || 0) > 0) {
      const valueType = body.discount_value_type || 'fixed';
      const calculated = this.discounts.calculateDiscount(originalAmount, valueType, Number(body.discount_value));
      appliedDiscount = {
        discount_id: body.discount_id || null,
        discount_kind: 'monthly_discount',
        discount_value_type: valueType,
        discount_value: Number(body.discount_value),
        original_amount: calculated.originalAmount,
        discount_amount: calculated.discountAmount,
        final_amount: calculated.finalAmount,
      };
    } else {
      const monthlyDiscount = await this.discounts.getActiveByStudent(Number(body.student_id), Number(scopedCenterId), 'monthly_discount');
      const serialDiscount = monthlyDiscount
        ? null
        : await this.discounts.getActiveByStudent(Number(body.student_id), Number(scopedCenterId), 'serial_discount');
      const active = monthlyDiscount || serialDiscount;
      if (active) {
        const calculated = this.discounts.calculateDiscount(originalAmount, active.discount_type, Number(active.value));
        appliedDiscount = {
          discount_id: active.discount_id,
          discount_kind: active.discount_kind,
          discount_value_type: active.discount_type,
          discount_value: Number(active.value),
          original_amount: calculated.originalAmount,
          discount_amount: calculated.discountAmount,
          final_amount: calculated.finalAmount,
        };
      }
    }

    const resolvedOriginalAmount = Number(appliedDiscount?.original_amount ?? originalAmount);
    const resolvedDiscountAmount = Number(appliedDiscount?.discount_amount ?? 0);
    const resolvedFinalAmount = Number(appliedDiscount?.final_amount ?? Math.max(0, resolvedOriginalAmount - resolvedDiscountAmount));
    const paidAmount = Number(body.amount || 0);
    const complete = body.is_complete ?? paidAmount >= resolvedFinalAmount;
    const payload = [
      body.student_id,
      scopedCenterId,
      paymentDate,
      body.amount,
      body.currency || 'UZS',
      body.payment_method || 'Cash',
      body.transaction_reference,
      body.receipt_number,
      body.payment_status || body.status || 'Completed',
      body.payment_type,
      body.notes,
      body.discount_id || appliedDiscount?.discount_id || null,
      body.discount_kind || appliedDiscount?.discount_kind || null,
      body.discount_value_type || appliedDiscount?.discount_value_type || null,
      body.discount_value ?? appliedDiscount?.discount_value ?? 0,
      resolvedOriginalAmount,
      resolvedDiscountAmount,
      resolvedFinalAmount,
      complete,
    ];

    if (appliedDiscount?.discount_kind === 'monthly_discount' && appliedDiscount?.discount_id) {
      return this.transactions.run(async (client) => {
        const payment = await this.payments.insert(payload, client);
        await this.discounts.update(appliedDiscount.discount_id, { active: false } as any, Number(scopedCenterId), client);
        return payment;
      });
    }

    return this.payments.insert(payload);
  }

  async updatePayment(id: number, body: any, centerId?: number, teacherId?: number) {
    const row = await this.payments.update(id, [body.amount, body.payment_status || body.status, body.notes], centerId, teacherId);
    if (!row) throw new NotFoundException('Payment not found');
    return row;
  }

  listByStudent(studentId: number, centerId?: number, teacherId?: number) {
    return this.payments.findByStudent(studentId, centerId, teacherId);
  }

  async deletePayment(id: number, centerId?: number, teacherId?: number) {
    const row = await this.payments.softDelete(id, centerId, teacherId);
    if (!row) throw new NotFoundException('Payment not found');
    return { message: 'Payment deleted successfully', payment: row };
  }

  async purgePayment(id: number, centerId?: number, teacherId?: number) {
    const row = await this.payments.purge(id, centerId, teacherId);
    if (!row) throw new NotFoundException('Soft-deleted payment not found');
    return { message: 'Payment permanently deleted', payment: row };
  }

  assertCanMutate(userType?: string) {
    if (userType === 'teacher') throw new ForbiddenException('Teachers cannot mutate payments.');
  }
}

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Queryable } from '../../../database/transaction.runner';
import type { Discount, DiscountCalculation, DiscountKind, DiscountValueType } from '../domain/discount.entity';
import { DISCOUNT_REPOSITORY, type DiscountRepositoryPort } from '../domain/discount.repository.port';

@Injectable()
export class DiscountService {
  constructor(@Inject(DISCOUNT_REPOSITORY) private readonly discounts: DiscountRepositoryPort) {}

  calculateDiscount(originalAmount: number, valueType: string, value: number): DiscountCalculation {
    const amount = Number(originalAmount || 0);
    const numericValue = Number(value || 0);
    const discountAmount =
      valueType === 'percent'
        ? Math.min(amount, Math.max(0, (amount * Math.min(numericValue, 100)) / 100))
        : Math.min(amount, Math.max(0, numericValue));
    return {
      originalAmount: amount,
      discountAmount,
      finalAmount: Math.max(0, amount - discountAmount),
    };
  }

  list(query: { student_id?: number; center_id?: number; active?: string; discount_kind?: string }, centerId?: number) {
    return this.discounts.findAll({
      studentId: query.student_id ? Number(query.student_id) : undefined,
      centerId: centerId ?? (query.center_id ? Number(query.center_id) : undefined),
      active: query.active === undefined ? undefined : query.active === 'true',
      discountKind: query.discount_kind,
    });
  }

  getById(id: number, centerId?: number) {
    return this.discounts.findById(id, centerId);
  }

  getActiveByStudent(studentId: number, centerId?: number, discountKind?: string) {
    return this.discounts.findActiveByStudent(studentId, centerId, discountKind);
  }

  async create(body: Partial<Discount> & { value_type?: DiscountValueType }, centerId?: number) {
    const valueType = (body.value_type || body.discount_type || 'fixed') as DiscountValueType;
    const discountKind = (body.discount_kind || 'serial_discount') as DiscountKind;
    const scopedCenterId = centerId ?? body.center_id;
    if (!body.student_id || !scopedCenterId) throw new BadRequestException('student_id and center_id are required.');

    const calculated =
      body.original_price != null ? this.calculateDiscount(Number(body.original_price), valueType, Number(body.value || 0)) : null;

    return this.discounts.insert({
      ...body,
      center_id: Number(scopedCenterId),
      discount_type: valueType,
      discount_kind: discountKind,
      final_price: body.final_price ?? calculated?.finalAmount ?? null,
      active: body.active ?? true,
    });
  }

  async update(id: number, body: Partial<Discount> & { value_type?: DiscountValueType }, centerId?: number, queryable?: Queryable) {
    const row = await this.discounts.update(id, {
      ...body,
      discount_type: body.value_type || body.discount_type,
    }, centerId, queryable);
    if (!row) throw new NotFoundException('Discount not found');
    return row;
  }

  async remove(id: number, centerId?: number) {
    const row = await this.discounts.delete(id, centerId);
    if (!row) throw new NotFoundException('Discount not found');
    return row;
  }
}

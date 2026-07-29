import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PAYMENT_PLANS_REPOSITORY, type PaymentPlansRepositoryPort } from '../domain/payment-plans.repository.port';

@Injectable()
export class PaymentPlansService {
  constructor(@Inject(PAYMENT_PLANS_REPOSITORY) private readonly repository: PaymentPlansRepositoryPort) {}

  list(centerId?: number) {
    return this.repository.findAll(centerId);
  }

  async get(id: number, centerId?: number) {
    const row = await this.repository.findById(id, centerId);
    if (!row) throw new NotFoundException('PaymentPlans record not found');
    return row;
  }

  create(payload: Record<string, unknown>, centerId?: number) {
    return this.repository.create(payload, centerId);
  }

  async update(id: number, payload: Record<string, unknown>, centerId?: number) {
    const row = await this.repository.update(id, payload, centerId);
    if (!row) throw new NotFoundException('PaymentPlans record not found');
    return row;
  }

  async remove(id: number, centerId?: number) {
    const row = await this.repository.delete(id, centerId);
    if (!row) throw new NotFoundException('PaymentPlans record not found');
    return row;
  }
}

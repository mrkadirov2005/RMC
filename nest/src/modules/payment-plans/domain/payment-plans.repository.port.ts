import type { PaymentPlansRecord } from './payment-plans.entity';

export const PAYMENT_PLANS_REPOSITORY = Symbol('PAYMENT_PLANS_REPOSITORY');

export interface PaymentPlansRepositoryPort {
  findAll(centerId?: number): Promise<PaymentPlansRecord[]>;
  findById(id: number, centerId?: number): Promise<PaymentPlansRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<PaymentPlansRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<PaymentPlansRecord | null>;
  delete(id: number, centerId?: number): Promise<PaymentPlansRecord | null>;
}

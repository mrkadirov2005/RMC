import type { Queryable } from '../../../database/transaction.runner';
import type { Discount } from './discount.entity';

export const DISCOUNT_REPOSITORY = Symbol('DISCOUNT_REPOSITORY');

export interface DiscountFilters {
  studentId?: number;
  centerId?: number;
  active?: boolean;
  discountKind?: string;
}

export interface DiscountRepositoryPort {
  findAll(filters: DiscountFilters): Promise<Discount[]>;
  findById(id: number, centerId?: number): Promise<Discount | null>;
  findActiveByStudent(studentId: number, centerId?: number, discountKind?: string): Promise<Discount | null>;
  insert(payload: Partial<Discount>, queryable?: Queryable): Promise<Discount>;
  update(id: number, payload: Partial<Discount>, centerId?: number, queryable?: Queryable): Promise<Discount | null>;
  delete(id: number, centerId?: number): Promise<Discount | null>;
}

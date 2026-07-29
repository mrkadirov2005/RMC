import type { Queryable } from '../../../database/transaction.runner';
import type { Payment } from './payment.entity';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface PaymentListOptions {
  centerId?: number;
  teacherId?: number;
  studentId?: number;
  limit?: number;
  offset?: number;
}

export interface PaymentRepositoryPort {
  findAll(options: PaymentListOptions): Promise<Payment[]>;
  findById(id: number, centerId?: number, teacherId?: number): Promise<Payment | null>;
  insert(params: any[], queryable?: Queryable): Promise<Payment>;
  update(id: number, params: any[], centerId?: number, teacherId?: number): Promise<Payment | null>;
  findByStudent(studentId: number, centerId?: number, teacherId?: number): Promise<Payment[]>;
  softDelete(id: number, centerId?: number, teacherId?: number): Promise<Payment | null>;
  purge(id: number, centerId?: number, teacherId?: number): Promise<Payment | null>;
}

import type { RefundsRecord } from './refunds.entity';

export const REFUNDS_REPOSITORY = Symbol('REFUNDS_REPOSITORY');

export interface RefundsRepositoryPort {
  findAll(centerId?: number): Promise<RefundsRecord[]>;
  findById(id: number, centerId?: number): Promise<RefundsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<RefundsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<RefundsRecord | null>;
  delete(id: number, centerId?: number): Promise<RefundsRecord | null>;
}

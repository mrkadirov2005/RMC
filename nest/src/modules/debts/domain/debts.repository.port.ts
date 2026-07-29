import type { DebtsRecord } from './debts.entity';

export const DEBTS_REPOSITORY = Symbol('DEBTS_REPOSITORY');

export interface DebtsRepositoryPort {
  findAll(centerId?: number): Promise<DebtsRecord[]>;
  findById(id: number, centerId?: number): Promise<DebtsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<DebtsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<DebtsRecord | null>;
  delete(id: number, centerId?: number): Promise<DebtsRecord | null>;
}

import type { ReportsRecord } from './reports.entity';

export const REPORTS_REPOSITORY = Symbol('REPORTS_REPOSITORY');

export interface ReportsRepositoryPort {
  findAll(centerId?: number): Promise<ReportsRecord[]>;
  findById(id: number, centerId?: number): Promise<ReportsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<ReportsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<ReportsRecord | null>;
  delete(id: number, centerId?: number): Promise<ReportsRecord | null>;
}

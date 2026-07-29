import type { SystemRecord } from './system.entity';

export const SYSTEM_REPOSITORY = Symbol('SYSTEM_REPOSITORY');

export interface SystemRepositoryPort {
  findAll(centerId?: number): Promise<SystemRecord[]>;
  findById(id: number, centerId?: number): Promise<SystemRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<SystemRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<SystemRecord | null>;
  delete(id: number, centerId?: number): Promise<SystemRecord | null>;
}

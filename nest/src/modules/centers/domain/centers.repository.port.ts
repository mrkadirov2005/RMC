import type { CentersRecord } from './centers.entity';

export const CENTERS_REPOSITORY = Symbol('CENTERS_REPOSITORY');

export interface CentersRepositoryPort {
  findAll(centerId?: number): Promise<CentersRecord[]>;
  findById(id: number, centerId?: number): Promise<CentersRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<CentersRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<CentersRecord | null>;
  delete(id: number, centerId?: number): Promise<CentersRecord | null>;
}

import type { ParentsRecord } from './parents.entity';

export const PARENTS_REPOSITORY = Symbol('PARENTS_REPOSITORY');

export interface ParentsRepositoryPort {
  findAll(centerId?: number): Promise<ParentsRecord[]>;
  findById(id: number, centerId?: number): Promise<ParentsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<ParentsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<ParentsRecord | null>;
  delete(id: number, centerId?: number): Promise<ParentsRecord | null>;
}

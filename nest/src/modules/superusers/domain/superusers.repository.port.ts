import type { SuperusersRecord } from './superusers.entity';

export const SUPERUSERS_REPOSITORY = Symbol('SUPERUSERS_REPOSITORY');

export interface SuperusersRepositoryPort {
  findAll(centerId?: number): Promise<SuperusersRecord[]>;
  findById(id: number, centerId?: number): Promise<SuperusersRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<SuperusersRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<SuperusersRecord | null>;
  delete(id: number, centerId?: number): Promise<SuperusersRecord | null>;
}
